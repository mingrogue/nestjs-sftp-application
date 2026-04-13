import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SftpClient from 'ssh2-sftp-client';
import * as fs from 'fs';
import { KafkaService } from '../kafka/kafka.service';
import { RedisService } from '../redis/redis.service';

interface FileInfo {
  name: string;
  modifyTime: number;
  size: number;
}

@Injectable()
export class SftpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SftpService.name);
  private sftp: SftpClient;
  private pollInterval: NodeJS.Timeout;
  private isPolling = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
  ) {
    this.sftp = new SftpClient();
  }

  async onModuleInit() {
    await this.connect();
    this.startPolling();
  }

  async onModuleDestroy() {
    this.stopPolling();
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const config = this.configService.get('sftp');
    
    const connectionConfig: SftpClient.ConnectOptions = {
      host: config.host,
      port: config.port,
      username: config.username,
    };

    if (config.privateKeyPath) {
      connectionConfig.privateKey = fs.readFileSync(config.privateKeyPath);
    } else if (config.password) {
      connectionConfig.password = config.password;
    }

    try {
      await this.sftp.connect(connectionConfig);
      this.logger.log(`Connected to SFTP server at ${config.host}:${config.port}`);
    } catch (error) {
      this.logger.error(`Failed to connect to SFTP server: ${error.message}`);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.sftp.end();
      this.logger.log('Disconnected from SFTP server');
    } catch (error) {
      this.logger.error(`Error disconnecting from SFTP: ${error.message}`);
    }
  }

  private startPolling(): void {
    const pollIntervalMs = this.configService.get<number>('sftp.pollIntervalMs');
    this.logger.log(`Starting SFTP folder polling every ${pollIntervalMs}ms`);
    
    this.pollInterval = setInterval(async () => {
      await this.pollFolder();
    }, pollIntervalMs);

    // Initial poll
    this.pollFolder();
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.logger.log('Stopped SFTP folder polling');
    }
  }

  private async pollFolder(): Promise<void> {
    if (this.isPolling) {
      this.logger.debug('Previous poll still in progress, skipping...');
      return;
    }

    this.isPolling = true;
    const remotePath = this.configService.get<string>('sftp.remotePath') || '/upload';

    try {
      const fileList = await this.sftp.list(remotePath);
      
      for (const file of fileList) {
        if (file.type !== '-') continue; // Skip directories
        
        await this.processFile(remotePath, file.name);
      }
    } catch (error) {
      this.logger.error(`Error polling SFTP folder: ${error.message}`);
      
      // Attempt to reconnect if connection was lost
      if (error.message.includes('No SFTP connection')) {
        this.logger.log('Attempting to reconnect...');
        try {
          await this.connect();
        } catch (reconnectError) {
          this.logger.error(`Reconnection failed: ${reconnectError.message}`);
        }
      }
    } finally {
      this.isPolling = false;
    }
  }

  private async processFile(remotePath: string, fileName: string): Promise<void> {
    const fullPath = `${remotePath}/${fileName}`;
    
    // Try to acquire Redis lock
    const lockAcquired = await this.redisService.acquireLock(fileName);
    if (!lockAcquired) {
      this.logger.debug(`Could not acquire lock for ${fileName}, skipping (processed by another worker)`);
      return;
    }
    
    this.logger.log(`Acquired lock for file: ${fileName}`);
    
    try {
      this.logger.log(`Processing file: ${fullPath}`);
      
      // Read file content
      const content = await this.sftp.get(fullPath);
      
      // Convert to string (assuming text files; adjust for binary if needed)
      const contentString = content.toString('utf-8');
      
      // Send to Kafka
      await this.kafkaService.sendDocument({
        fileName,
        filePath: fullPath,
        content: contentString,
        processedAt: new Date().toISOString(),
      });
      
      // Delete the file after successful processing
      await this.sftp.delete(fullPath);
      this.logger.log(`Successfully processed and deleted file: ${fileName}`);
    } catch (error) {
      this.logger.error(`Error processing file ${fileName}: ${error.message}`);
    } finally {
      // Always release the lock
      await this.redisService.releaseLock(fileName);
    }
  }

  async listFiles(): Promise<FileInfo[]> {
    const remotePath = this.configService.get<string>('sftp.remotePath') || '/upload';
    const fileList = await this.sftp.list(remotePath);
    
    return fileList
      .filter(file => file.type === '-')
      .map(file => ({
        name: file.name,
        modifyTime: file.modifyTime,
        size: file.size,
      }));
  }
}
