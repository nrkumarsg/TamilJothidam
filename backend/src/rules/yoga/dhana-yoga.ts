import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';
import { aggregateLordConnections } from './yoga-helpers';

// Dhana Yoga (தன யோகம்) — wealth-indicating combinations. Classical texts
// describe MANY dhana yoga variants (2nd+9th, 2nd+5th, 5th+11th, etc.);
// this implements the single most commonly cited core version — connection
// (conjunction, mutual aspect, or exchange) between the 2nd lord (dhana,
// accumulated wealth) and the 11th lord (labha, gains/income). Other
// classical dhana combinations are not implemented here.
export const dhanaYoga: YogaRule = {
  name: 'Dhana Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    return aggregateLordConnections(chart.houses, [[2, 11]], 'Dhana Yoga', 'dhana_yoga');
  },
};
