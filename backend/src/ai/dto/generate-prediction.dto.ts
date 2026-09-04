import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Language } from '@prisma/client';
import { PREDICTION_SECTIONS, PredictionSection } from '../prediction.types';
import { PalanPeriodDto } from './palan-period.dto';

export class GeneratePredictionDto {
  @IsEnum(PREDICTION_SECTIONS)
  section!: PredictionSection;

  @IsEnum(Language)
  language!: Language;

  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;

  // Omitted = CURRENT (unchanged Phase 13 behavior: current dasha/bukti
  // only). See interpretation.service.ts for the caching tradeoff this
  // introduces for non-CURRENT modes.
  @IsOptional()
  @ValidateNested()
  @Type(() => PalanPeriodDto)
  palanPeriod?: PalanPeriodDto;
}
