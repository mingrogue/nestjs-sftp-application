import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, logLevel } from 'kafkajs';

export interface DocumentMessage {
  fileName: string;
  filePath: string;
  content: string;
  processedAt: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private topic: string;

  constructor(private readonly configService: ConfigService) {
    const kafkaConfig = this.configService.get('kafka');
    
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
      logLevel: logLevel.WARN,
    });
    
    this.producer = this.kafka.producer();
    this.topic = kafkaConfig.topic;
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error(`Failed to connect Kafka producer: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    } catch (error) {
      this.logger.error(`Error disconnecting Kafka producer: ${error.message}`);
    }
  }

  async sendDocument(document: DocumentMessage): Promise<void> {
    try {
      const message = {
        key: document.fileName,
        value: JSON.stringify(document),
        headers: {
          'content-type': 'application/json',
          'source': 'sftp-source',
        },
      };

      await this.producer.send({
        topic: this.topic,
        messages: [message],
      });

      this.logger.log(`Document sent to Kafka topic '${this.topic}': ${document.fileName}`);
    } catch (error) {
      this.logger.error(`Failed to send document to Kafka: ${error.message}`);
      throw error;
    }
  }

  async sendBatch(documents: DocumentMessage[]): Promise<void> {
    try {
      const messages = documents.map(doc => ({
        key: doc.fileName,
        value: JSON.stringify(doc),
        headers: {
          'content-type': 'application/json',
          'source': 'sftp-source',
        },
      }));

      await this.producer.send({
        topic: this.topic,
        messages,
      });

      this.logger.log(`Batch of ${documents.length} documents sent to Kafka`);
    } catch (error) {
      this.logger.error(`Failed to send batch to Kafka: ${error.message}`);
      throw error;
    }
  }
}
