import { Module } from '@nestjs/common';
import { CalculationController } from './calculation.controller';
import { CalculationService } from './calculation.service';
import { EphemerisService } from './ephemeris.service';

@Module({
  controllers: [CalculationController],
  providers: [CalculationService, EphemerisService],
  // EphemerisService is exported too: the transit engine (Phase 10) needs
  // sidereal longitudes for arbitrary dates, not just birth-time charts.
  exports: [CalculationService, EphemerisService],
})
export class CalculationModule {}
