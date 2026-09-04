import { houseFromSign } from '../../calculation/derivation';
import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';

const KENDRA_FROM_MOON = [1, 4, 7, 10];

// Gaja Kesari Yoga (கஜ கேசரி யோகம்) — BPHS: formed when Jupiter occupies a
// kendra (1st/4th/7th/10th) counted from the natal Moon. A well-known,
// largely uncontested combination associated with intelligence and
// reputation.
export const gajaKesariYoga: YogaRule = {
  name: 'Gaja Kesari Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const moon = chart.planets.find((p) => p.graha === 'MOON');
    const jupiter = chart.planets.find((p) => p.graha === 'JUPITER');
    if (!moon || !jupiter) return null;

    const houseFromMoon = houseFromSign(jupiter.signIndex, moon.signIndex);
    if (!KENDRA_FROM_MOON.includes(houseFromMoon)) return null;

    return {
      name: 'Gaja Kesari Yoga',
      participatingPlanets: ['MOON', 'JUPITER'],
      participatingHouses: [moon.house, jupiter.house],
      strength: houseFromMoon === 1 ? 'STRONG' : 'MODERATE', // conjunction with Moon is the tightest case
      interpretationKey: 'gaja_kesari_yoga',
    };
  },
};
