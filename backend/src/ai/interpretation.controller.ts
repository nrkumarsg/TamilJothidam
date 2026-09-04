import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InterpretationService } from './interpretation.service';
import { GeneratePredictionDto } from './dto/generate-prediction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class InterpretationController {
  constructor(private readonly interpretationService: InterpretationService) {}

  // POST /jathakams/:id/predictions {section, language, regenerate?}
  // Returns the cached Prediction if one already exists for this exact
  // (jathakam, section, language), unless regenerate=true — AI calls cost
  // time and money, so we don't silently re-generate on every request.
  @Post(':id/predictions')
  generate(@Param('id') id: string, @Body() dto: GeneratePredictionDto) {
    return this.interpretationService.generate(id, dto.section, dto.language, dto.regenerate ?? false, dto.palanPeriod);
  }

  @Get(':id/predictions')
  list(@Param('id') id: string) {
    return this.interpretationService.listForJathakam(id);
  }
}
