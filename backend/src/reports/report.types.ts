import { Language, Prediction } from '@prisma/client';
import { BilingualLabel } from '../jathakam/names';
import { PredictionSection } from '../ai/prediction.types';

// Which of REPORT_SECTIONS's 34 slugs (backend/src/i18n/glossary.ts, spec
// §28) already have real, deterministic, already-computed data behind
// them from earlier phases — the report generator does not recompute or
// duplicate any of this JSON, it only tells the caller which existing
// endpoint/panel to use: GET /jathakams/:id (lagna_rasi, nakshatra_pada,
// planetary_positions, rasi_chart, navamsa_chart, house_analysis, yogas,
// doshas), GET /jathakams/:id/dasha (vimshottari_dasha, current_dasha), and
// GET /jathakams/:id/transits (transit_results).
export const CHART_DATA_SLUGS: ReadonlySet<string> = new Set([
  'lagna_rasi',
  'nakshatra_pada',
  'planetary_positions',
  'rasi_chart',
  'navamsa_chart',
  'house_analysis',
  'yogas',
  'doshas',
  'vimshottari_dasha',
  'current_dasha',
  'transit_results',
]);

// Which report slugs map to an already-built AI prediction section. Not
// every slug has an exact 1:1 spec match — 'karma' and 'future' are
// close-but-not-identical to 'spirituality' (27) and 'future_life' (16)
// and are mapped here anyway since they are the closest existing content,
// documented rather than silently assumed. Every other slug below matches
// its PredictionSection name exactly.
export const AI_SECTION_BY_SLUG: Readonly<Partial<Record<string, PredictionSection>>> = {
  summary: 'basic_reading',
  health: 'health',
  wealth: 'wealth',
  career: 'career',
  marriage: 'marriage',
  spirituality: 'karma',
  future_life: 'future',
  graha_phalan: 'graha_phalan',
  past_life: 'past_life',
  present_life: 'present_life',
  business: 'business',
  family: 'family',
  children: 'children',
  education: 'education',
  foreign_travel: 'foreign_travel',
  property: 'property',
  favorable_periods: 'favorable_periods',
  favorable_days: 'favorable_days',
  favorable_colors: 'favorable_colors',
  favorable_numbers: 'favorable_numbers',
  remedies: 'remedies',
  life_timeline: 'life_timeline',
  final_summary: 'final_summary',
};

export type ReportSectionStatus = 'chart_data' | 'ai_generated' | 'ai_pending' | 'unavailable';

export interface ReportSectionEntry {
  id: number;
  slug: string;
  title: BilingualLabel;
  status: ReportSectionStatus;
  predictionSection?: PredictionSection;
  prediction?: Prediction | null;
}

export interface FullReport {
  jathakamId: string;
  language: Language;
  generatedAt: string;
  sections: ReportSectionEntry[];
}
