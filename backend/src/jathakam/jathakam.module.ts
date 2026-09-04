import { Module } from '@nestjs/common';
import { JathakamController } from './jathakam.controller';
import { JathakamService } from './jathakam.service';
import { CalculationModule } from '../calculation/calculation.module';
import { DashaModule } from '../dasha/dasha.module';
import { AuthModule } from '../auth/auth.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [CalculationModule, DashaModule, AuthModule, LoggingModule],
  controllers: [JathakamController],
  providers: [JathakamService],
  exports: [JathakamService],
})
export class JathakamModule {}
