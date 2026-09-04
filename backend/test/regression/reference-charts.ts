import { BirthTimeAccuracy, Gender } from '@prisma/client';

// The fixed set of reference charts the regression suite runs against
// (Phase 19, spec §38 "Create regression tests using known reference
// calculations").
//
// Every earlier phase verified exactly ONE chart by hand — CHENNAI_1990,
// below. That left a real gap: the engine could be badly wrong for a
// southern-hemisphere birth, a negative UTC offset, a DST-era birth, or an
// extreme latitude and nothing would have caught it. These six charts are
// chosen so each one exercises a code path the canonical chart does not.
export interface ReferenceChart {
  key: string;
  description: string;
  /** What this chart is here to stress that the others don't. */
  stresses: string;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  timeAccuracy: BirthTimeAccuracy;
  location: {
    placeName: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffsetMinutes: number;
    dstApplicable: boolean;
    manuallyCorrected: boolean;
  };
  /**
   * Sidereal sign the Sun must occupy (0=Mesham .. 11=Meenam), derived
   * independently of this engine from the date alone: the Sun's sidereal
   * longitude is a function of the time of year minus the ayanamsa, and
   * barely moves with location. Dates are deliberately chosen mid-sidereal-
   * month, well away from a sankranti boundary, so a few degrees of error
   * in the hand derivation still can't flip the expected sign.
   */
  expectedSunSignIndex: number;
}

export const CHENNAI_1990: ReferenceChart = {
  key: 'chennai-1990',
  description: 'Chennai, India — the canonical chart hand-verified in Phases 4-18',
  stresses: 'The baseline every earlier phase checked by hand (yogas, doshas, dasha, PDF).',
  name: 'Regression Chennai 1990',
  gender: 'MALE',
  dateOfBirth: '1990-01-15',
  timeOfBirth: '08:30',
  timeAccuracy: 'EXACT',
  location: {
    placeName: 'Chennai, Tamil Nadu, India',
    country: 'India',
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 'Asia/Kolkata',
    utcOffsetMinutes: 330,
    dstApplicable: false,
    manuallyCorrected: false,
  },
  // Jan 15 sits just after Makara Sankranti, which fell on Jan 14 in 1990
  // — so by 08:30 that morning the Sun has already crossed into Makaram.
  // (calculation.service.spec.ts pins the Jan-13 / Jan-16 behaviour around
  // the same boundary for a modern year.)
  expectedSunSignIndex: 9, // Makaram / Capricorn
};

export const SYDNEY_1985: ReferenceChart = {
  key: 'sydney-1985',
  description: 'Sydney, Australia — southern hemisphere, DST in effect',
  stresses: 'Negative latitude and a southern-summer DST offset (+11, not +10).',
  name: 'Regression Sydney 1985',
  gender: 'FEMALE',
  dateOfBirth: '1985-03-02',
  timeOfBirth: '14:20',
  timeAccuracy: 'EXACT',
  location: {
    placeName: 'Sydney, New South Wales, Australia',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'Australia/Sydney',
    utcOffsetMinutes: 660,
    dstApplicable: true,
    manuallyCorrected: false,
  },
  expectedSunSignIndex: 10, // Kumbam / Aquarius
};

export const NEW_YORK_1975: ReferenceChart = {
  key: 'new-york-1975',
  description: 'New York, USA — western hemisphere, negative UTC offset, EDT',
  stresses: 'Negative longitude AND negative UTC offset, with historic DST.',
  name: 'Regression New York 1975',
  gender: 'MALE',
  dateOfBirth: '1975-07-04',
  timeOfBirth: '18:45',
  timeAccuracy: 'WITHIN_5_MIN',
  location: {
    placeName: 'New York, New York, United States',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    utcOffsetMinutes: -240,
    dstApplicable: true,
    manuallyCorrected: false,
  },
  expectedSunSignIndex: 2, // Mithunam / Gemini
};

export const LONDON_2000_MIDNIGHT: ReferenceChart = {
  key: 'london-2000-midnight',
  description: 'London, UK — a few minutes past midnight',
  stresses: 'Date-boundary handling: the local date and the UTC date agree here, but the instant sits at the very start of the day.',
  name: 'Regression London 2000',
  gender: 'OTHER',
  dateOfBirth: '2000-11-05',
  timeOfBirth: '00:15',
  timeAccuracy: 'EXACT',
  location: {
    placeName: 'London, England, United Kingdom',
    country: 'United Kingdom',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
    utcOffsetMinutes: 0,
    dstApplicable: false,
    manuallyCorrected: false,
  },
  expectedSunSignIndex: 6, // Thulam / Libra
};

export const SINGAPORE_2010: ReferenceChart = {
  key: 'singapore-2010',
  description: 'Singapore — near-equatorial latitude',
  stresses: 'Latitude ~1°N, where ascendant maths behaves very differently from mid-latitudes.',
  name: 'Regression Singapore 2010',
  gender: 'FEMALE',
  dateOfBirth: '2010-09-01',
  timeOfBirth: '11:05',
  timeAccuracy: 'WITHIN_15_MIN',
  location: {
    placeName: 'Singapore',
    country: 'Singapore',
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: 'Asia/Singapore',
    utcOffsetMinutes: 480,
    dstApplicable: false,
    manuallyCorrected: false,
  },
  expectedSunSignIndex: 4, // Simmam / Leo
};

export const REYKJAVIK_1999: ReferenceChart = {
  key: 'reykjavik-1999',
  description: 'Reykjavík, Iceland — extreme northern latitude',
  stresses: 'Latitude 64°N, the hardest case for ascendant/house calculation.',
  name: 'Regression Reykjavik 1999',
  gender: 'MALE',
  dateOfBirth: '1999-05-25',
  timeOfBirth: '03:40',
  timeAccuracy: 'UNKNOWN',
  location: {
    placeName: 'Reykjavík, Iceland',
    country: 'Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    utcOffsetMinutes: 0,
    dstApplicable: false,
    manuallyCorrected: false,
  },
  expectedSunSignIndex: 1, // Rishabam / Taurus
};

export const REFERENCE_CHARTS: ReferenceChart[] = [
  CHENNAI_1990,
  SYDNEY_1985,
  NEW_YORK_1975,
  LONDON_2000_MIDNIGHT,
  SINGAPORE_2010,
  REYKJAVIK_1999,
];

// Strips the values that legitimately differ between runs (database ids,
// timestamps) so the rest of a chart can be compared against a golden
// snapshot. Everything left behind is pure output of the calculation
// engine and rule engines.
export function stripVolatileFields<T>(value: T): T {
  const VOLATILE = new Set([
    'id',
    'jathakamId',
    'profileId',
    'calculationSettingId',
    'userId',
    'createdAt',
    'updatedAt',
    'generatedAt',
    'asOfDate',
  ]);

  if (Array.isArray(value)) {
    return value.map((item) => stripVolatileFields(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (VOLATILE.has(key)) continue;
      out[key] = stripVolatileFields(val);
    }
    return out as T;
  }
  return value;
}
