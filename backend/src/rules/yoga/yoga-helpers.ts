import { Graha } from '@prisma/client';
import { aspectedHouses } from '../../jathakam/house-analysis';
import { YogaChartHouse } from './yoga.types';

export function houseOf(houses: YogaChartHouse[], houseNo: number): YogaChartHouse {
  const h = houses.find((x) => x.houseNo === houseNo);
  if (!h) throw new Error(`House ${houseNo} missing from chart input`);
  return h;
}

export type LordConnectionType = 'CONJUNCTION' | 'EXCHANGE' | 'ASPECT';

// Are the lords of two houses connected — the standard basis for the
// "Raja Yoga family" of combinations (BPHS ch. 39-41: a kendra lord and a
// trikona lord joined by conjunction, mutual aspect, or exchange of signs
// (parivartana) generates Raja Yoga; the same connection test applies to
// other lord-pairs, e.g. 9th+10th for Dharma Karma Adhipati Yoga, 2nd+11th
// for this Dhana Yoga variant).
//
// Two houses ruled by the SAME planet are not a "connection" in this sense
// (there is only one significator, not two collaborating) and return null.
export function lordConnection(
  houses: YogaChartHouse[],
  houseA: number,
  houseB: number,
): LordConnectionType | null {
  const a = houseOf(houses, houseA);
  const b = houseOf(houses, houseB);
  if (a.lord === b.lord) return null;

  if (a.lordHouse === b.lordHouse) return 'CONJUNCTION';
  if (a.lordHouse === houseB && b.lordHouse === houseA) return 'EXCHANGE';

  const aAspectsB = aspectedHouses(a.lord, a.lordHouse).includes(b.lordHouse);
  const bAspectsA = aspectedHouses(b.lord, b.lordHouse).includes(a.lordHouse);
  if (aAspectsB || bAspectsA) return 'ASPECT';

  return null;
}

// Aggregates every valid kendra/trikona-style lord connection among the
// given house-number pairs into one YogaResult, or null if none connect.
// Strength: STRONG if any pair connects by conjunction/exchange (the
// tightest classical connections), otherwise MODERATE (aspect only) — a
// documented simplification, not full classical strength grading (see
// calculation/derivation.ts simplifiedStrengthScore for the same pattern
// applied to graha strength).
export function aggregateLordConnections(
  houses: YogaChartHouse[],
  pairs: [number, number][],
  name: string,
  interpretationKey: string,
): import('./yoga.types').YogaResult | null {
  const found: { houseA: number; houseB: number; type: LordConnectionType }[] = [];

  for (const [houseA, houseB] of pairs) {
    if (houseA === houseB) continue;
    const type = lordConnection(houses, houseA, houseB);
    if (type) found.push({ houseA, houseB, type });
  }

  if (found.length === 0) return null;

  const participatingPlanets = new Set<Graha>();
  const participatingHouses = new Set<number>();
  let strongest = false;

  for (const f of found) {
    participatingPlanets.add(houseOf(houses, f.houseA).lord);
    participatingPlanets.add(houseOf(houses, f.houseB).lord);
    participatingHouses.add(f.houseA);
    participatingHouses.add(f.houseB);
    if (f.type === 'CONJUNCTION' || f.type === 'EXCHANGE') strongest = true;
  }

  return {
    name,
    participatingPlanets: [...participatingPlanets],
    participatingHouses: [...participatingHouses].sort((a, b) => a - b),
    strength: strongest ? 'STRONG' : 'MODERATE',
    interpretationKey,
  };
}
