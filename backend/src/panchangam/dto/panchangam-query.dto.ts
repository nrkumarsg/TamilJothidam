import { Type } from 'class-transformer';
import { IsISO8601, IsLatitude, IsLongitude, IsString, Matches } from 'class-validator';

export class PanchangamQueryDto {
  // Date only — the panchangam is a property of a day at a place, not of an
  // instant.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be an ISO calendar date, e.g. 2026-09-05' })
  @IsISO8601()
  date!: string;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  // IANA zone name. Not validated against the full tz database here — Luxon
  // rejects an unknown zone when the date is parsed, and the service turns
  // that into a 400 naming the zone.
  @IsString()
  timezone!: string;
}
