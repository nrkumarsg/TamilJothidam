import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';

// Budha Aditya Yoga (புத ஆதித்ய யோகம்) — Sun and Mercury conjunct in the
// same house/sign. A well-known, uncontested combination (Mercury is
// always within ~28° of the Sun, so this is one of the more commonly
// occurring yogas). Some texts note it is strongest when Mercury is not
// combust; that refinement is not implemented here — see spec's general
// combustion field on the Mercury Planet row for that context separately.
export const budhaAdityaYoga: YogaRule = {
  name: 'Budha Aditya Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const sun = chart.planets.find((p) => p.graha === 'SUN');
    const mercury = chart.planets.find((p) => p.graha === 'MERCURY');
    if (!sun || !mercury) return null;
    if (sun.house !== mercury.house) return null;

    return {
      name: 'Budha Aditya Yoga',
      participatingPlanets: ['SUN', 'MERCURY'],
      participatingHouses: [sun.house],
      strength: 'MODERATE',
      interpretationKey: 'budha_aditya_yoga',
    };
  },
};
