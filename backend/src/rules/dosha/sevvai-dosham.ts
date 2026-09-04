import { DoshaChartInput, DoshaResult, DoshaRule, DoshaSeverity } from './dosha.types';

// Sevvai Dosham / Kuja Dosha / "Manglik" (செவ்வாய் தோஷம்) — Mars placed in
// specific houses from the natal Lagna. The most commonly cited house set
// is {1,2,4,7,8,12}; some texts additionally check Mars's placement from
// the Moon and from Venus, which is NOT implemented here (Lagna-reckoning
// only). Severity grading (7th/8th = STRONG, 1st/4th/12th = MODERATE, 2nd =
// LOW) follows the commonly taught ranking that the marriage (7th) and
// longevity (8th) houses carry the most weight; exact rankings vary by text.
const SEVERITY_BY_HOUSE: Partial<Record<number, DoshaSeverity>> = {
  1: 'MODERATE',
  2: 'LOW',
  4: 'MODERATE',
  7: 'STRONG',
  8: 'STRONG',
  12: 'MODERATE',
};

export const sevvaiDosham: DoshaRule = {
  name: 'Sevvai Dosham (Manglik)',
  evaluate(chart: DoshaChartInput): DoshaResult | null {
    const mars = chart.planets.find((p) => p.graha === 'MARS');
    if (!mars) return null;

    const severity = SEVERITY_BY_HOUSE[mars.house];
    if (!severity) return null;

    return {
      name: 'Sevvai Dosham (Manglik)',
      severity,
      ruleTriggered: `Mars (Sevvai) is placed in house ${mars.house} from Lagna`,
    };
  },
};
