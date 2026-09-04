import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Graha } from '@prisma/client';
import { PALAN_PERIOD_MODES, PalanPeriodMode } from '../palan-period.types';

export class PalanPeriodDto {
  @IsEnum(PALAN_PERIOD_MODES)
  mode!: PalanPeriodMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  years?: number;

  @IsOptional()
  @IsEnum(Graha)
  untilMahadashaGraha?: Graha;

  @IsOptional()
  @IsEnum(Graha)
  untilAntardashaGraha?: Graha;
}
