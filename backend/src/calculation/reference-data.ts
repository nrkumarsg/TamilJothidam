import { Graha } from '@prisma/client';

// Classical reference tables used by the calculation engine's dignity,
// combustion, and simplified-strength derivations. Every table here
// documents its classical source — the AI layer never invents this data,
// it only ever reads the pre-computed result (see docs/ARCHITECTURE.md
// § AI architecture, authority hierarchy).

export type ClassicalGraha = 'SUN' | 'MOON' | 'MARS' | 'MERCURY' | 'JUPITER' | 'VENUS' | 'SATURN';

export const CLASSICAL_GRAHAS: ClassicalGraha[] = [
  'SUN',
  'MOON',
  'MARS',
  'MERCURY',
  'JUPITER',
  'VENUS',
  'SATURN',
];

// Rasi adhipati (sign lordship), index 0=Mesha(Aries) .. 11=Meena(Pisces).
export const SIGN_LORDS: ClassicalGraha[] = [
  'MARS', // 0 Mesha / Aries
  'VENUS', // 1 Rishabam / Taurus
  'MERCURY', // 2 Mithunam / Gemini
  'MOON', // 3 Kadagam / Cancer
  'SUN', // 4 Simmam / Leo
  'MERCURY', // 5 Kanni / Virgo
  'VENUS', // 6 Thulam / Libra
  'MARS', // 7 Viruchigam / Scorpio
  'JUPITER', // 8 Dhanusu / Sagittarius
  'SATURN', // 9 Magaram / Capricorn
  'SATURN', // 10 Kumbam / Aquarius
  'JUPITER', // 11 Meenam / Pisces
];

// Uchcha (exaltation) sign + exact degree, per Brihat Parashara Hora
// Shastra (BPHS) ch. 4. Debilitation (neecha) is always the exactly
// opposite sign at the same degree — derived, not tabulated separately.
export const EXALTATION: Record<ClassicalGraha, { signIndex: number; degree: number }> = {
  SUN: { signIndex: 0, degree: 10 }, // Aries 10°
  MOON: { signIndex: 1, degree: 3 }, // Taurus 3°
  MARS: { signIndex: 9, degree: 28 }, // Capricorn 28°
  MERCURY: { signIndex: 5, degree: 15 }, // Virgo 15°
  JUPITER: { signIndex: 3, degree: 5 }, // Cancer 5°
  VENUS: { signIndex: 11, degree: 27 }, // Pisces 27°
  SATURN: { signIndex: 6, degree: 20 }, // Libra 20°
};

// Swakshetra (own signs), BPHS ch. 4.
export const OWN_SIGNS: Record<ClassicalGraha, number[]> = {
  SUN: [4],
  MOON: [3],
  MARS: [0, 7],
  MERCURY: [2, 5],
  JUPITER: [8, 11],
  VENUS: [1, 6],
  SATURN: [9, 10],
};

// Naisargika Maitri (natural/permanent planetary friendship), BPHS ch. 5.
// Deliberately asymmetric — this is a classical feature of the system, not
// a bug (e.g. Moon treats Mars as neutral, but Mars treats Moon as a friend).
// Rahu/Ketu are excluded: classical texts disagree substantially on their
// natural relationships, so dignity for the nodes is left null rather than
// asserting a contested rule as fact (see determineDignity in derivation.ts).
export const NATURAL_FRIENDSHIP: Record<ClassicalGraha, { friends: ClassicalGraha[]; enemies: ClassicalGraha[] }> = {
  SUN: { friends: ['MOON', 'MARS', 'JUPITER'], enemies: ['VENUS', 'SATURN'] },
  MOON: { friends: ['SUN', 'MERCURY'], enemies: [] },
  MARS: { friends: ['SUN', 'MOON', 'JUPITER'], enemies: ['MERCURY'] },
  MERCURY: { friends: ['SUN', 'VENUS'], enemies: ['MOON'] },
  JUPITER: { friends: ['SUN', 'MOON', 'MARS'], enemies: ['MERCURY', 'VENUS'] },
  VENUS: { friends: ['MERCURY', 'SATURN'], enemies: ['SUN', 'MOON'] },
  SATURN: { friends: ['MERCURY', 'VENUS'], enemies: ['SUN', 'MOON', 'MARS'] },
};

// Combustion (asta) orbs in degrees of angular separation from the Sun.
// Values follow the commonly used Panchangam convention (e.g. Surya
// Siddhanta-derived tables); exact orbs vary slightly by text/tradition.
// Sun/Rahu/Ketu are not applicable (Sun cannot be combust to itself; most
// traditions do not apply combustion to the lunar nodes).
export const COMBUSTION_ORBS: Partial<
  Record<ClassicalGraha, { direct: number; retrograde?: number }>
> = {
  MOON: { direct: 12 },
  MARS: { direct: 17 },
  MERCURY: { direct: 14, retrograde: 12 },
  JUPITER: { direct: 11 },
  VENUS: { direct: 10, retrograde: 8 },
  SATURN: { direct: 15 },
};

// Simplified strength proxy (NOT full classical Shadbala — see derivation.ts
// simplifiedStrengthScore doc comment for why full Shadbala is out of scope
// for this phase).
export const DIGNITY_STRENGTH_POINTS: Record<string, number> = {
  EXALTED: 1.0,
  OWN_SIGN: 0.75,
  FRIENDLY: 0.6,
  NEUTRAL: 0.5,
  ENEMY: 0.25,
  DEBILITATED: 0.0,
};

export function isClassicalGraha(graha: Graha): graha is ClassicalGraha {
  return (CLASSICAL_GRAHAS as string[]).includes(graha);
}
