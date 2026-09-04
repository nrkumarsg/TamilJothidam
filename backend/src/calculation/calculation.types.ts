import { Dignity, Graha } from '@prisma/client';

export interface ChartCalculationInput {
  dateOfBirth: string; // "1990-01-15"
  timeOfBirth: string; // "08:30" or "08:30:00", local wall-clock time
  timezone: string; // IANA zone, e.g. "Asia/Kolkata"
  latitude: number;
  longitude: number;
}

export interface GrahaResult {
  graha: Graha;
  longitude: number; // sidereal, 0-360
  signIndex: number; // 0=Mesha(Aries) .. 11=Meenam(Pisces)
  degreeInSign: number;
  nakshatra: number; // 1-27
  pada: number; // 1-4
  house: number; // 1-12, whole-sign from Lagna
  retrograde: boolean;
  combust: boolean;
  dignity: Dignity | null;
  strengthScore: number | null;
}

export interface ChartCalculationResult {
  julianDayUt: number;
  ayanamsaDegrees: number;
  engineVersion: string;
  lagna: GrahaResult;
  planets: GrahaResult[];
}
