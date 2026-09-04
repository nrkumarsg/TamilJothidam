import { Graha } from '@prisma/client';

// Vimshottari Dasha — 120-year cycle split among 9 grahas in a fixed order
// with fixed year-lengths (classical, universal across all traditions —
// unlike some of the contested rules elsewhere in this codebase, this part
// of Vimshottari is not disputed). Source: BPHS ch. 46.
export const DASHA_ORDER: Graha[] = [
  'KETU',
  'VENUS',
  'SUN',
  'MOON',
  'MARS',
  'RAHU',
  'JUPITER',
  'SATURN',
  'MERCURY',
];

export const DASHA_YEARS: Partial<Record<Graha, number>> = {
  KETU: 7,
  VENUS: 20,
  SUN: 6,
  MOON: 10,
  MARS: 7,
  RAHU: 18,
  JUPITER: 16,
  SATURN: 19,
  MERCURY: 17,
};

// 7+20+6+10+7+18+16+19+17 = 120.
export const TOTAL_CYCLE_YEARS = 120;

// Standard convention across Vimshottari implementations: 1 dasha-year =
// 365.25 days (not the exact tropical/sidereal year). The resulting drift
// is on the order of minutes per year — negligible next to typical birth
// time uncertainty.
export const DAYS_PER_YEAR = 365.25;

export function yearsOf(graha: Graha): number {
  return DASHA_YEARS[graha]!;
}

// Nakshatra lord: the 27 nakshatras are ruled by the same 9 grahas in the
// same DASHA_ORDER sequence, repeated 3 times (nakshatra 1=Ketu, 2=Venus,
// ..., 9=Mercury, 10=Ketu again, ...). This lord is the starting Mahadasha
// at birth.
export function nakshatraLordGraha(nakshatra: number): Graha {
  return DASHA_ORDER[(nakshatra - 1) % 9];
}
