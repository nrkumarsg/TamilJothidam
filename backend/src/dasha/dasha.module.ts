import { Module } from '@nestjs/common';
import { DashaController } from './dasha.controller';
import { DashaService } from './dasha.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DashaController],
  providers: [DashaService],
  exports: [DashaService],
})
export class DashaModule {}
