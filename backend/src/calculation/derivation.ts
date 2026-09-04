import { Dignity, Graha } from '@prisma/client';
import {
  CLASSICAL_GRAHAS,
  COMBUSTION_ORBS,
  ClassicalGraha,
  DIGNITY_STRENGTH_POINTS,
  EXALTATION,
  NATURAL_FRIENDSHIP,
  OWN_SIGNS,
  SIGN_LORDS,
  isClassicalGraha,
} from './reference-data';

const SIGN_SPAN_DEGREES = 30;
const NAKSHATRA_SPAN_DEGREES = 360 / 27; // 13°20'
const PADA_SPAN_DEGREES = NAKSHATRA_SPAN_DEGREES / 4; // 3°20'

export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

// Shortest angular separation between two longitudes, always in [0, 180].
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return diff > 180 ? 360 - diff : diff;
}

export function longitudeToSign(longitude: number): { signIndex: number; degreeInSign: number } {
  const norm = normalizeDegrees(longitude);
  const signIndex = Math.floor(norm / SIGN_SPAN_DEGREES);
  const degreeInSign = norm - signIndex * SIGN_SPAN_DEGREES;
  return { signIndex, degreeInSign };
}

export function longitudeToNakshatraPada(longitude: number): { nakshatra: number; pada: number } {
  const norm = normalizeDegrees(longitude);
  const nakshatraIndex = Math.floor(norm / NAKSHATRA_SPAN_DEGREES); // 0-26
  const withinNakshatra = norm - nakshatraIndex * NAKSHATRA_SPAN_DEGREES;
  const pada = Math.floor(withinNakshatra / PADA_SPAN_DEGREES) + 1; // 1-4
  return { nakshatra: nakshatraIndex + 1, pada }; // nakshatra 1-27
}

// Whole-sign (Rasi) house system, standard in Tamil/Vedic practice: house 1
// is whichever sign contains the Lagna, and houses follow the signs in
// order — not an equal 30°-from-ascendant-degree system.
export function houseFromSign(signIndex: number, lagnaSignIndex: number): number {
  return ((signIndex - lagnaSignIndex + 12) % 12) + 1;
}

// Dignity per BPHS: exaltation > debilitation > own sign > sign-lord's
// natural relationship to this graha (friend/enemy) > neutral.
// Returns null for Rahu/Ketu/Lagna — see reference-data.ts NATURAL_FRIENDSHIP
// doc comment for why the nodes are excluded rather than guessed.
export function determineDignity(graha: Graha, signIndex: number): Dignity | null {
  if (!isClassicalGraha(graha)) return null;

  const exalt = EXALTATION[graha];
  if (exalt.signIndex === signIndex) return 'EXALTED';

  const debilitationSign = (exalt.signIndex + 6) % 12;
  if (debilitationSign === signIndex) return 'DEBILITATED';

  if (OWN_SIGNS[graha].includes(signIndex)) return 'OWN_SIGN';

  const lord = SIGN_LORDS[signIndex];
  if (lord === graha) return 'OWN_SIGN';

  const { friends, enemies } = NATURAL_FRIENDSHIP[graha];
  if (friends.includes(lord)) return 'FRIENDLY';
  if (enemies.includes(lord)) return 'ENEMY';
  return 'NEUTRAL';
}

// Asta (combustion): true when the graha's angular separation from the Sun
// is within the classical orb for that graha. Not applicable to the Sun
// itself or the lunar nodes (see reference-data.ts COMBUSTION_ORBS).
export function isCombust(
  graha: Graha,
  grahaLongitude: number,
  sunLongitude: number,
  retrograde: boolean,
): boolean {
  if (!isClassicalGraha(graha) || graha === 'SUN') return false;
  const orbEntry = COMBUSTION_ORBS[graha as ClassicalGraha];
  if (!orbEntry) return false;
  const orb = retrograde && orbEntry.retrograde !== undefined ? orbEntry.retrograde : orbEntry.direct;
  return angularSeparation(grahaLongitude, sunLongitude) <= orb;
}

// Simplified strength proxy (a single dignity-derived score in [0,1]).
// This is NOT classical Shadbala (six-fold strength: Sthana/Dig/Kala/
// Chesta/Naisargika/Drik Bala) — that system is materially more complex
// and methodology varies across texts/software. This proxy exists so the
// `strengthScore` field is populated with something honestly documented;
// a full Shadbala engine is a candidate future enhancement, not claimed here.
export function simplifiedStrengthScore(dignity: Dignity | null): number | null {
  if (dignity === null) return null;
  return DIGNITY_STRENGTH_POINTS[dignity] ?? null;
}

export { CLASSICAL_GRAHAS };
