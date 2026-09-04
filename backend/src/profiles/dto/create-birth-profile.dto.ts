import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { BirthTimeAccuracy, Gender } from '@prisma/client';
import { CreateBirthLocationDto } from './create-birth-location.dto';

export class CreateBirthProfileDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(Gender)
  gender!: Gender;

  // ISO date, e.g. "1990-01-15"
  @IsDateString()
  dateOfBirth!: string;

  // Local time-of-birth as entered, HH:mm or HH:mm:ss — paired with
  // location.timezone by downstream engines (Phase 4) to derive UTC.
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: 'timeOfBirth must be in HH:mm or HH:mm:ss format',
  })
  timeOfBirth!: string;

  // spec §2: "பிறந்த நேரம் எவ்வளவு துல்லியமானது?"
  @IsEnum(BirthTimeAccuracy)
  timeAccuracy!: BirthTimeAccuracy;

  @ValidateNested()
  @Type(() => CreateBirthLocationDto)
  location!: CreateBirthLocationDto;
}
