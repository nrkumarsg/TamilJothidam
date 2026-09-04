import { Graha } from '@prisma/client';
import { DoshaChartInput, DoshaResult, DoshaRule } from './dosha.types';

const CLASSICAL_SEVEN: Graha[] = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];

function angleFrom(fromLongitude: number, toLongitude: number): number {
  return ((toLongitude - fromLongitude) % 360 + 360) % 360;
}

// Kala Sarpa Dosha (கால சர்ப்ப தோஷம்) — a well-defined, uncontested
// geometric condition: all 7 classical grahas fall within the same 180°
// semicircle between Rahu and Ketu, i.e. none of them "cross" the
// nodal axis. Detected by checking whether every classical graha's angular
// distance from Rahu (measured the same direction) is uniformly < 180° or
// uniformly >= 180° — if even one graha falls on the opposite side, the
// dosha does not apply. This implements presence detection only; the finer
// classical sub-classification by which specific graha is closest to Rahu
// (Ananta, Kulika, Vasuki, ... — 12 named variants) is not implemented.
export const kalaSarpaDosha: DoshaRule = {
  name: 'Kala Sarpa Dosha',
  evaluate(chart: DoshaChartInput): DoshaResult | null {
    const rahu = chart.planets.find((p) => p.graha === 'RAHU');
    const ketu = chart.planets.find((p) => p.graha === 'KETU');
    if (!rahu || !ketu) return null;

    const sevenPlanets = CLASSICAL_SEVEN.map((g) => chart.planets.find((p) => p.graha === g)).filter(
      (p): p is NonNullable<typeof p> => p !== undefined,
    );
    if (sevenPlanets.length < 7) return null;

    const allForward = sevenPlanets.every((p) => angleFrom(rahu.longitude, p.longitude) < 180);
    const allBackward = sevenPlanets.every((p) => angleFrom(rahu.longitude, p.longitude) >= 180);

    if (!allForward && !allBackward) return null;

    return {
      name: 'Kala Sarpa Dosha',
      severity: 'STRONG',
      ruleTriggered: `All 7 classical grahas fall within the 180° arc ${
        allForward ? 'from Rahu to Ketu' : 'from Ketu to Rahu'
      }`,
    };
  },
};
