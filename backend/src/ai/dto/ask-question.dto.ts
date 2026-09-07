import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

export class AskQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question!: string;

  @IsEnum(Language)
  language!: Language;
}
