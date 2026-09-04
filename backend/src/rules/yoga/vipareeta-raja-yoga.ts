import { Graha } from '@prisma/client';
import { YogaChartInput, YogaResult, YogaRule } from './yoga.types';

const DUSTHANA_HOUSES = [6, 8, 12];

// Vipareeta Raja Yoga (விபரீத ராஜ யோகம்) — BPHS: formed when a dusthana
// (difficult house: 6th/8th/12th) lord is placed in a DIFFERENT dusthana
// house (not its own). Classically named per lord — Harsha Yoga (6th lord
// in 8th/12th), Sarala Yoga (8th lord in 6th/12th), Vimala Yoga (12th lord
// in 6th/8th) — the malefic significations of the dusthana houses are
// considered to neutralize each other rather than compound.
export const vipareetaRajaYoga: YogaRule = {
  name: 'Vipareeta Raja Yoga',
  evaluate(chart: YogaChartInput): YogaResult | null {
    const participatingPlanets: Graha[] = [];
    const participatingHouses: number[] = [];

    for (const dusthanaHouseNo of DUSTHANA_HOUSES) {
      const house = chart.houses.find((h) => h.houseNo === dusthanaHouseNo)!;
      const lordIsInOtherDusthana =
        DUSTHANA_HOUSES.includes(house.lordHouse) && house.lordHouse !== dusthanaHouseNo;
      if (lordIsInOtherDusthana) {
        participatingPlanets.push(house.lord);
        participatingHouses.push(dusthanaHouseNo);
      }
    }

    if (participatingPlanets.length === 0) return null;

    return {
      name: 'Vipareeta Raja Yoga',
      participatingPlanets,
      participatingHouses,
      strength: participatingPlanets.length > 1 ? 'STRONG' : 'MODERATE',
      interpretationKey: 'vipareeta_raja_yoga',
    };
  },
};
