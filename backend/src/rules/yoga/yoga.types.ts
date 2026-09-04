import { Dignity, Graha } from '@prisma/client';

// Minimal chart view each YogaRule needs — built once from already-persisted
// Planet/House data (see jathakam.service.ts), no new astronomical
// computation. Deliberately narrow: yoga rules should reason about houses
// and lordships, not reach back into raw ephemeris data.
export interface YogaChartPlanet {
  graha: Graha;
  signIndex: number;
  house: number; // natal house, 1-12
  dignity: Dignity | null;
}

export interface YogaChartHouse {
  houseNo: number; // 1-12
  signIndex: number;
  lord: Graha;
  lordHouse: number; // which house that lord currently occupies
}

export interface YogaChartInput {
  planets: YogaChartPlanet[]; // includes LAGNA (dignity null)
  houses: YogaChartHouse[]; // all 12
}

export type YogaStrength = 'LOW' | 'MODERATE' | 'STRONG';

export interface YogaResult {
  name: string;
  participatingPlanets: Graha[];
  participatingHouses: number[];
  strength: YogaStrength;
  interpretationKey: string;
}

export interface YogaRule {
  name: string;
  evaluate(chart: YogaChartInput): YogaResult | null;
}
