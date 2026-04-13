import { Module } from '@nestjs/common';
import { SftpService } from './sftp.service';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  providers: [SftpService],
  exports: [SftpService],
})
export class SftpModule {}
