import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';
import { aggregateLordConnections } from './yoga-helpers';

const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIKONA_HOUSES = [1, 5, 9];

// Raja Yoga (ராஜ யோகம்) — BPHS ch. 39. Formed when a kendra (angular:
// 1/4/7/10) house-lord and a trikona (trinal: 1/5/9) house-lord are
// connected by conjunction, mutual aspect, or sign exchange. Every
// kendra-trikona lord pair (excluding a house paired with itself) is
// checked; house 1 is both kendra and trikona, so its lord participates in
// both roles.
export const rajaYoga: YogaRule = {
  name: 'Raja Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const pairs: [number, number][] = [];
    for (const k of KENDRA_HOUSES) {
      for (const t of TRIKONA_HOUSES) {
        if (k !== t) pairs.push([k, t]);
      }
    }
    return aggregateLordConnections(chart.houses, pairs, 'Raja Yoga', 'raja_yoga');
  },
};
