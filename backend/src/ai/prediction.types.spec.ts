import { PREDICTION_SECTIONS, confidenceFromTimeAccuracy, isPredictionSection } from './prediction.types';

describe('prediction.types', () => {
  it('has the original 7 spec §33 sections plus the 16 that complete the 34-section report', () => {
    expect(PREDICTION_SECTIONS).toEqual([
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
    ]);
  });

  describe('isPredictionSection', () => {
    it('accepts every known section', () => {
      for (const section of PREDICTION_SECTIONS) {
        expect(isPredictionSection(section)).toBe(true);
      }
    });

    it('rejects unknown strings', () => {
      expect(isPredictionSection('longevity')).toBe(false);
      expect(isPredictionSection('')).toBe(false);
    });
  });

  describe('confidenceFromTimeAccuracy', () => {
    it('maps EXACT and WITHIN_5_MIN to HIGH', () => {
      expect(confidenceFromTimeAccuracy('EXACT')).toBe('HIGH');
      expect(confidenceFromTimeAccuracy('WITHIN_5_MIN')).toBe('HIGH');
    });

    it('maps WITHIN_15_MIN and WITHIN_30_MIN to MEDIUM', () => {
      expect(confidenceFromTimeAccuracy('WITHIN_15_MIN')).toBe('MEDIUM');
      expect(confidenceFromTimeAccuracy('WITHIN_30_MIN')).toBe('MEDIUM');
    });

    it('maps UNKNOWN to LOW', () => {
      expect(confidenceFromTimeAccuracy('UNKNOWN')).toBe('LOW');
    });
  });
});
