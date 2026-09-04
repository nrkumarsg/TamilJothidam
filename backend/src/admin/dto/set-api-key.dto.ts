import { IsEnum, IsString, MinLength } from 'class-validator';
import { AIProviderId } from '@prisma/client';

export class SetApiKeyDto {
  @IsEnum(AIProviderId)
  provider!: AIProviderId;

  @IsString()
  @MinLength(1)
  key!: string;
}
