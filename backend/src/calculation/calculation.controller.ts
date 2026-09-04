import { Body, Controller, Post } from '@nestjs/common';
import { CalculationService } from './calculation.service';
import { PreviewChartDto } from './dto/preview-chart.dto';

@Controller('calculation')
export class CalculationController {
  constructor(private readonly calculationService: CalculationService) {}

  // Debug/audit endpoint (spec §36) — computes a chart from raw birth
  // parameters without persisting anything. Phase 5's jathakam engine will
  // call CalculationService directly and persist against a Jathakam row;
  // this endpoint exists for manual verification during development and
  // for the future admin debug-mode view.
  @Post('preview')
  preview(@Body() dto: PreviewChartDto) {
    return this.calculationService.computeChart(dto);
  }
}
