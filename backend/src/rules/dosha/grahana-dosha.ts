import { DoshaChartInput, DoshaResult, DoshaRule } from './dosha.types';

// Grahana Dosha (கிரகண தோஷம்) — a luminary (Sun or Moon) conjunct a lunar
// node (Rahu or Ketu), symbolically an "eclipse" configuration in the
// birth chart. A well-defined, uncontested condition. Sun-node conjunction
// is graded STRONG (more classically emphasized, and geometrically rarer —
// occurs roughly every ~18 months of the Rahu/Ketu cycle intersecting the
// Sun's yearly cycle); Moon-node conjunction is graded MODERATE.
//
// Note: Sun-Rahu/Sun-Ketu can also trigger Pitru Dosha (pitru-dosha.ts).
// This is intentional overlap, not a bug — the two names document
// different traditional concerns about the same placement, the same way
// Janma Shani and Sade Sati's peak phase overlap (see transits/transit-flags.ts).
export const grahanaDosha: DoshaRule = {
  name: 'Grahana Dosha',
  evaluate(chart: DoshaChartInput): DoshaResult | null {
    const sun = chart.planets.find((p) => p.graha === 'SUN');
    const moon = chart.planets.find((p) => p.graha === 'MOON');
    const rahu = chart.planets.find((p) => p.graha === 'RAHU');
    const ketu = chart.planets.find((p) => p.graha === 'KETU');
    if (!sun || !moon || !rahu || !ketu) return null;

    if (sun.house === rahu.house) {
      return { name: 'Grahana Dosha', severity: 'STRONG', ruleTriggered: `Sun conjunct Rahu in house ${sun.house}` };
    }
    if (sun.house === ketu.house) {
      return { name: 'Grahana Dosha', severity: 'STRONG', ruleTriggered: `Sun conjunct Ketu in house ${sun.house}` };
    }
    if (moon.house === rahu.house) {
      return {
        name: 'Grahana Dosha',
        severity: 'MODERATE',
        ruleTriggered: `Moon conjunct Rahu in house ${moon.house}`,
      };
    }
    if (moon.house === ketu.house) {
      return {
        name: 'Grahana Dosha',
        severity: 'MODERATE',
        ruleTriggered: `Moon conjunct Ketu in house ${moon.house}`,
      };
    }

    return null;
  },
};
