import { DoshaChartInput, DoshaResult, DoshaRule } from './dosha.types';

// Pitru Dosha (பித்ரு தோஷம்) — ancestral/paternal affliction. Unlike most
// rules in this engine, Pitru Dosha has no single canonical Parashari
// definition; it is documented inconsistently across regional and folk
// traditions. This implements the most commonly cited indicators, checked
// in order of how directly they're usually emphasized:
//   1. Sun conjunct Rahu or Ketu (STRONG) — the most frequently cited
//      trigger, the Sun being the primary father/ancestor significator.
//   2. A node (Rahu/Ketu) occupying the 9th house (father), or the 9th
//      lord conjunct a node (MODERATE) — weaker, more indirect signals.
// Other regionally-cited indicators (e.g. Saturn-Sun combinations) are not
// implemented here.
export const pitruDosha: DoshaRule = {
  name: 'Pitru Dosha',
  evaluate(chart: DoshaChartInput): DoshaResult | null {
    const sun = chart.planets.find((p) => p.graha === 'SUN');
    const rahu = chart.planets.find((p) => p.graha === 'RAHU');
    const ketu = chart.planets.find((p) => p.graha === 'KETU');
    if (!sun || !rahu || !ketu) return null;

    if (sun.house === rahu.house) {
      return { name: 'Pitru Dosha', severity: 'STRONG', ruleTriggered: `Sun conjunct Rahu in house ${sun.house}` };
    }
    if (sun.house === ketu.house) {
      return { name: 'Pitru Dosha', severity: 'STRONG', ruleTriggered: `Sun conjunct Ketu in house ${sun.house}` };
    }

    if (rahu.house === 9) {
      return { name: 'Pitru Dosha', severity: 'MODERATE', ruleTriggered: 'Rahu occupies the 9th house (father)' };
    }
    if (ketu.house === 9) {
      return { name: 'Pitru Dosha', severity: 'MODERATE', ruleTriggered: 'Ketu occupies the 9th house (father)' };
    }

    const ninthHouse = chart.houses.find((h) => h.houseNo === 9);
    const ninthLord = ninthHouse && chart.planets.find((p) => p.graha === ninthHouse.lord);
    if (ninthLord) {
      if (ninthLord.house === rahu.house) {
        return { name: 'Pitru Dosha', severity: 'MODERATE', ruleTriggered: '9th lord conjunct Rahu' };
      }
      if (ninthLord.house === ketu.house) {
        return { name: 'Pitru Dosha', severity: 'MODERATE', ruleTriggered: '9th lord conjunct Ketu' };
      }
    }

    return null;
  },
};
