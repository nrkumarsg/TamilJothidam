import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';
import { aggregateLordConnections } from './yoga-helpers';

// Dharma Karma Adhipati Yoga (தர்ம கர்ம அதிபதி யோகம்) — BPHS: a
// particularly auspicious Raja-Yoga-family combination specifically
// between the 9th lord (dharma) and 10th lord (karma), connected by
// conjunction, mutual aspect, or exchange.
export const dharmaKarmaAdhipatiYoga: YogaRule = {
  name: 'Dharma Karma Adhipati Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    return aggregateLordConnections(
      chart.houses,
      [[9, 10]],
      'Dharma Karma Adhipati Yoga',
      'dharma_karma_adhipati_yoga',
    );
  },
};
