import { Module } from '@nestjs/common';
import { UsageLogService } from './usage-log.service';

@Module({
  providers: [UsageLogService],
  exports: [UsageLogService],
})
export class LoggingModule {}
