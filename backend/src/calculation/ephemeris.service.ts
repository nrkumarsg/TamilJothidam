import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DateTime } from 'luxon';
import * as sweph from 'sweph';
import { Graha } from '@prisma/client';
import { normalizeDegrees } from './derivation';

// Moshier semi-analytical mode: sub-arcsecond-to-arcsecond precision,
// valid ~3000 BCE-3000 CE, and needs NO external ephemeris data files —
// unlike SEFLG_SWIEPH/SEFLG_JPLEPH which require downloading multi-MB .se1
// files. Birth-time uncertainty (even "exact" birth times are rarely
// accurate to better than a minute) dwarfs the small precision difference,
// so Moshier is the right tradeoff for this application.
const CALC_FLAGS = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED | sweph.constants.SEFLG_SIDEREAL;

const GRAHA_TO_SWEPH_ID: Record<'SUN' | 'MOON' | 'MARS' | 'MERCURY' | 'JUPITER' | 'VENUS' | 'SATURN' | 'RAHU', number> = {
  SUN: sweph.constants.SE_SUN,
  MOON: sweph.constants.SE_MOON,
  MARS: sweph.constants.SE_MARS,
  MERCURY: sweph.constants.SE_MERCURY,
  JUPITER: sweph.constants.SE_JUPITER,
  VENUS: sweph.constants.SE_VENUS,
  SATURN: sweph.constants.SE_SATURN,
  // True node (as opposed to mean node) — the commonly preferred choice in
  // contemporary Vedic practice, tracking the Moon's actual osculating orbit.
  RAHU: sweph.constants.SE_TRUE_NODE,
};

export interface LongitudeResult {
  longitude: number;
  speedLongitude: number;
}

@Injectable()
export class EphemerisService {
  constructor() {
    // Lahiri is the platform default and, for now, only supported ayanamsa
    // (spec §3: "never silently change the ayanamsa"). Every computed chart
    // records this via CalculationSetting — see prisma/schema.prisma.
    sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  }

  // Converts a birth's local wall-clock time + IANA timezone into a Julian
  // Day (Universal Time), the single input every other ephemeris call needs.
  // Using the IANA zone (not a stored UTC-offset) keeps this correct for
  // historical dates where DST rules differed from today's.
  julianDayUt(localDateTime: string, timezone: string): number {
    const local = DateTime.fromISO(localDateTime, { zone: timezone });
    if (!local.isValid) {
      throw new InternalServerErrorException(
        `Invalid birth date/time "${localDateTime}" in zone ${timezone}: ${local.invalidReason}`,
      );
    }
    // utc_to_jd needs UTC calendar components, not the local wall-clock
    // ones — converting here is what actually applies the timezone offset.
    const dt = local.toUTC();
    const result = sweph.utc_to_jd(
      dt.year,
      dt.month,
      dt.day,
      dt.hour,
      dt.minute,
      dt.second + dt.millisecond / 1000,
      sweph.constants.SE_GREG_CAL,
    );
    return result.data[1]; // [ephemeris time, universal time] -> UT
  }

  ayanamsaDegrees(julianDayUt: number): number {
    return sweph.get_ayanamsa_ut(julianDayUt);
  }

  // Sidereal longitude for any graha except Lagna. Ketu is derived as
  // Rahu + 180° (the node axis is a straight line through Earth), which is
  // the standard approach — Swiss Ephemeris has no separate Ketu body.
  siderealLongitudeForGraha(graha: Exclude<Graha, 'LAGNA'>, julianDayUt: number): LongitudeResult {
    if (graha === 'KETU') {
      const rahu = this.rawSiderealLongitude(GRAHA_TO_SWEPH_ID.RAHU, julianDayUt);
      return {
        longitude: normalizeDegrees(rahu.longitude + 180),
        speedLongitude: rahu.speedLongitude,
      };
    }
    return this.rawSiderealLongitude(GRAHA_TO_SWEPH_ID[graha], julianDayUt);
  }

  // Sidereal Ascendant (Lagna) longitude. House system passed is irrelevant
  // to this value — the Ascendant point is returned identically regardless
  // — 'W' (Whole Sign) is used since that's this platform's house system
  // (see derivation.ts houseFromSign).
  ascendantLongitude(julianDayUt: number, latitude: number, longitude: number): number {
    const result = sweph.houses_ex(julianDayUt, CALC_FLAGS, latitude, longitude, 'W');
    return result.data.points[0];
  }

  private rawSiderealLongitude(planetId: number, julianDayUt: number): LongitudeResult {
    const result = sweph.calc_ut(julianDayUt, planetId, CALC_FLAGS);
    if (result.error) {
      throw new InternalServerErrorException(`Ephemeris calculation failed: ${result.error}`);
    }
    return { longitude: result.data[0], speedLongitude: result.data[3] };
  }
}
