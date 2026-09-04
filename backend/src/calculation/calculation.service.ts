import { Injectable } from '@nestjs/common';
import { Graha } from '@prisma/client';
import { EphemerisService } from './ephemeris.service';
import {
  determineDignity,
  houseFromSign,
  isCombust,
  longitudeToNakshatraPada,
  longitudeToSign,
  simplifiedStrengthScore,
} from './derivation';
import { ChartCalculationInput, ChartCalculationResult, GrahaResult } from './calculation.types';

// Exported so the jathakam engine (Phase 5) can record exactly which engine
// version produced a persisted chart, on the CalculationSetting row.
export const ENGINE_VERSION = 'sweph-2.10.3-moshier-lahiri-v1';

// Order matches the Prisma Graha enum minus LAGNA (handled separately since
// it has no dignity/combustion/retrograde concept of its own).
const GRAHA_ORDER: Exclude<Graha, 'LAGNA'>[] = [
  'SUN',
  'MOON',
  'MARS',
  'MERCURY',
  'JUPITER',
  'VENUS',
  'SATURN',
  'RAHU',
  'KETU',
];

// The astronomical calculation engine (spec §3, §37 pipeline stage 3-4).
// Pure computation: astronomy in, structured numbers out. No interpretation,
// no AI, no database writes — Phase 5's jathakam engine calls this and
// persists the result. See docs/ARCHITECTURE.md § Pipeline.
@Injectable()
export class CalculationService {
  constructor(private readonly ephemeris: EphemerisService) {}

  computeChart(input: ChartCalculationInput): ChartCalculationResult {
    const time = input.timeOfBirth.length === 5 ? `${input.timeOfBirth}:00` : input.timeOfBirth;
    const localDateTime = `${input.dateOfBirth}T${time}`;

    const julianDayUt = this.ephemeris.julianDayUt(localDateTime, input.timezone);
    const ayanamsaDegrees = this.ephemeris.ayanamsaDegrees(julianDayUt);

    const ascendantLongitude = this.ephemeris.ascendantLongitude(julianDayUt, input.latitude, input.longitude);
    const { signIndex: lagnaSignIndex, degreeInSign: lagnaDegree } = longitudeToSign(ascendantLongitude);
    const { nakshatra: lagnaNakshatra, pada: lagnaPada } = longitudeToNakshatraPada(ascendantLongitude);

    const lagna: GrahaResult = {
      graha: 'LAGNA',
      longitude: ascendantLongitude,
      signIndex: lagnaSignIndex,
      degreeInSign: lagnaDegree,
      nakshatra: lagnaNakshatra,
      pada: lagnaPada,
      house: 1,
      retrograde: false,
      combust: false,
      dignity: null,
      strengthScore: null,
    };

    const sun = this.ephemeris.siderealLongitudeForGraha('SUN', julianDayUt);

    const planets: GrahaResult[] = GRAHA_ORDER.map((graha) => {
      const { longitude, speedLongitude } =
        graha === 'SUN' ? sun : this.ephemeris.siderealLongitudeForGraha(graha, julianDayUt);

      const { signIndex, degreeInSign } = longitudeToSign(longitude);
      const { nakshatra, pada } = longitudeToNakshatraPada(longitude);
      const house = houseFromSign(signIndex, lagnaSignIndex);
      const retrograde = speedLongitude < 0;
      const combust = isCombust(graha, longitude, sun.longitude, retrograde);
      const dignity = determineDignity(graha, signIndex);
      const strengthScore = simplifiedStrengthScore(dignity);

      return {
        graha,
        longitude,
        signIndex,
        degreeInSign,
        nakshatra,
        pada,
        house,
        retrograde,
        combust,
        dignity,
        strengthScore,
      };
    });

    return { julianDayUt, ayanamsaDegrees, engineVersion: ENGINE_VERSION, lagna, planets };
  }
}
