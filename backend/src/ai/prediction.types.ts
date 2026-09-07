import { BirthTimeAccuracy, PredictionConfidence } from '@prisma/client';

// The 7 sections spec §33 named as the initial prompt-template set, plus
// the 16 that closed out the full 34-section structure (see
// backend/src/i18n/glossary.ts REPORT_SECTIONS and
// backend/src/reports/report.types.ts AI_SECTION_BY_SLUG for how each of
// these 23 maps onto the 34 report slugs — the remaining 11 slugs are
// deterministic chart data, not AI prose, and are served directly from
// the jathakam/dasha/transit endpoints instead).
export const PREDICTION_SECTIONS = [
  'basic_reading',
  'health',
  'wealth',
  'career',
  'marriage',
  'karma',
  'future',
  'graha_phalan',
  'past_life',
  'present_life',
  'business',
  'family',
  'children',
  'education',
  'foreign_travel',
  'property',
  'favorable_periods',
  'favorable_days',
  'favorable_colors',
  'favorable_numbers',
  'remedies',
  'life_timeline',
  'final_summary',
] as const;

export type PredictionSection = (typeof PREDICTION_SECTIONS)[number];

export function isPredictionSection(value: string): value is PredictionSection {
  return (PREDICTION_SECTIONS as readonly string[]).includes(value);
}

// Confidence (spec §30): "Every major prediction should internally have a
// confidence score... Based on: Birth time accuracy, number of supporting
// factors, Dasha support, Transit support, conflicting indications." This
// implements the single strongest and most directly available factor —
// birth time accuracy — as a documented starting point; the fuller
// multi-factor weighting described in spec §30 is not implemented here.
export function confidenceFromTimeAccuracy(timeAccuracy: BirthTimeAccuracy): PredictionConfidence {
  switch (timeAccuracy) {
    case 'EXACT':
    case 'WITHIN_5_MIN':
      return 'HIGH';
    case 'WITHIN_15_MIN':
    case 'WITHIN_30_MIN':
      return 'MEDIUM';
    case 'UNKNOWN':
      return 'LOW';
  }
}
