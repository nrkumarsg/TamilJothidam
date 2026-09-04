import { Module } from '@nestjs/common';
import { PanchangamController } from './panchangam.controller';
import { PanchangamService } from './panchangam.service';
import { CalculationModule } from '../calculation/calculation.module';

@Module({
  imports: [CalculationModule],
  controllers: [PanchangamController],
  providers: [PanchangamService],
  exports: [PanchangamService],
})
export class PanchangamModule {}
