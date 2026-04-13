import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get('redis');
    
    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });

    await this.client.connect();
    this.logger.log(`Connected to Redis at ${config.host}:${config.port}`);
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }

  /**
   * Try to acquire a lock for a file. Returns true if lock acquired, false otherwise.
   * Uses SET NX (set if not exists) for atomic locking.
   */
  async acquireLock(fileName: string, ttlSeconds: number = 300): Promise<boolean> {
    const lockKey = `sftp:lock:${fileName}`;
    const result = await this.client.set(lockKey, Date.now().toString(), {
      NX: true,
      EX: ttlSeconds,
    });
    return result === 'OK';
  }

  /**
   * Release a lock for a file.
   */
  async releaseLock(fileName: string): Promise<void> {
    const lockKey = `sftp:lock:${fileName}`;
    await this.client.del(lockKey);
  }
}
