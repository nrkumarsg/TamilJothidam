import { Graha } from '@prisma/client';

// Minimal chart view each DoshaRule needs — built once from already-
// persisted Planet/House data (same pattern as rules/yoga/yoga.types.ts).
export interface DoshaChartPlanet {
  graha: Graha;
  longitude: number;
  signIndex: number;
  house: number; // natal house from Lagna, 1-12
}

export interface DoshaChartHouse {
  houseNo: number;
  lord: Graha;
  lordHouse: number;
}

export interface DoshaChartInput {
  planets: DoshaChartPlanet[];
  houses: DoshaChartHouse[];
}

export type DoshaSeverity = 'LOW' | 'MODERATE' | 'STRONG';

export interface DoshaResult {
  name: string;
  severity: DoshaSeverity;
  // A concise, factual description of exactly which condition matched
  // (spec §22: "explain the actual rule that triggered it") — an audit
  // trail string, not display prose. Bilingual traditional-meaning text
  // lives separately in dosha-names.ts, same split as yoga's `description`.
  ruleTriggered: string;
}

export interface DoshaRule {
  name: string;
  evaluate(chart: DoshaChartInput): DoshaResult | null;
}
