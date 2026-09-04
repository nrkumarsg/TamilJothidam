import { BirthTimeAccuracy, PredictionConfidence } from '@prisma/client';

// The 7 report sections spec §33 names as the initial prompt-template set.
// Phase 15 (full report generator) will assemble the complete 34-section
// report; this is the initial working set proving the pipeline end-to-end.
export const PREDICTION_SECTIONS = [
  'basic_reading',
  'health',
  'wealth',
  'career',
  'marriage',
  'karma',
  'future',
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
