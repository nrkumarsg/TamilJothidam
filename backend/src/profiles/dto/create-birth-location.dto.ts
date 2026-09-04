import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Submitted by the frontend after the user has picked/confirmed a place in
// the intake wizard (spec §2: search + auto-determine lat/lng/timezone/DST,
// with manual correction allowed). The backend does not re-resolve it here —
// /locations/search and /locations/timezone are the resolution helpers the
// frontend calls before submitting this.
export class CreateBirthLocationDto {
  @IsString()
  placeName!: string;

  @IsString()
  country!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  timezone!: string;

  @IsNumber()
  utcOffsetMinutes!: number;

  @IsOptional()
  @IsBoolean()
  dstApplicable?: boolean;

  @IsOptional()
  @IsBoolean()
  manuallyCorrected?: boolean;
}
