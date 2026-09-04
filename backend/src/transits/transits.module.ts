import { Module } from '@nestjs/common';
import { TransitsController } from './transits.controller';
import { TransitsService } from './transits.service';
import { CalculationModule } from '../calculation/calculation.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CalculationModule, AuthModule],
  controllers: [TransitsController],
  providers: [TransitsService],
  exports: [TransitsService],
})
export class TransitsModule {}
