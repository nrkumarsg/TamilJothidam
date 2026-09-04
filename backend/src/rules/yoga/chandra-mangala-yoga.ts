import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';

// Chandra Mangala Yoga (சந்திர மங்கள யோகம்) — Moon and Mars conjunct in
// the same house/sign. A well-known wealth-and-enterprise combination
// (though some texts warn it can also indicate volatility depending on
// other factors, which is interpretation, not the structural condition
// implemented here).
export const chandraMangalaYoga: YogaRule = {
  name: 'Chandra Mangala Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const moon = chart.planets.find((p) => p.graha === 'MOON');
    const mars = chart.planets.find((p) => p.graha === 'MARS');
    if (!moon || !mars) return null;
    if (moon.house !== mars.house) return null;

    return {
      name: 'Chandra Mangala Yoga',
      participatingPlanets: ['MOON', 'MARS'],
      participatingHouses: [moon.house],
      strength: 'MODERATE',
      interpretationKey: 'chandra_mangala_yoga',
    };
  },
};
