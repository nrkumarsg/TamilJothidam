import { SIGN_LORDS } from '../../calculation/reference-data';
import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';

const KENDRA_FROM_LAGNA = [1, 4, 7, 10];

// Neecha Bhanga Raja Yoga (நீச பங்க ராஜ யோகம்) — "cancellation of
// debilitation". BPHS ch. 4 gives several distinct conditions under which
// a debilitated planet's weakness is cancelled (and, per some texts,
// converted into a Raja Yoga); this implements the single most commonly
// taught primary condition — the dispositor (the lord of the sign the
// debilitated planet occupies) is itself placed in a kendra (1st/4th/7th/
// 10th) from the natal Lagna. The other recognized conditions (e.g. the
// planet exalted in that same sign being in a kendra, or the dispositor
// also being exalted) are not implemented here.
export const neechaBhangaRajaYoga: YogaRule = {
  name: 'Neecha Bhanga Raja Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const debilitated = chart.planets.filter((p) => p.dignity === 'DEBILITATED');
    if (debilitated.length === 0) return null;

    for (const planet of debilitated) {
      const dispositorGraha = SIGN_LORDS[planet.signIndex];
      const dispositor = chart.planets.find((p) => p.graha === dispositorGraha);
      if (!dispositor) continue;

      if (KENDRA_FROM_LAGNA.includes(dispositor.house)) {
        return {
          name: 'Neecha Bhanga Raja Yoga',
          participatingPlanets: [planet.graha, dispositor.graha],
          participatingHouses: [planet.house, dispositor.house],
          strength: 'MODERATE',
          interpretationKey: 'neecha_bhanga_raja_yoga',
        };
      }
    }

    return null;
  },
};
