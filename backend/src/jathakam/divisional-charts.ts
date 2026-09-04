// Divisional charts (vargas) — Phase 7 implements Navamsa (D9) only, behind
// a small interface so D2/D3/D4/D7/D10/D12/D16/D20/D24/D27/D30/D40/D45/D60
// can be added later without restructuring (per jathakam/README.md).
export interface DivisionalChartCalculator {
  readonly divisions: number;
  computeSignIndex(signIndex: number, degreeInSign: number): number;
}

const NAVAMSA_DIVISIONS = 9;
const NAVAMSA_SPAN_DEGREES = 30 / NAVAMSA_DIVISIONS; // 3°20'

// Navamsa (D9), BPHS ch. 6. Classically stated as three separate rules by
// sign modality:
//   - Movable (Mesham/Kadagam/Thulam/Magaram): navamsa count starts from
//     the sign itself.
//   - Fixed (Rishabam/Simmam/Viruchigam/Kumbam): starts from the 9th sign
//     from itself (e.g. Rishabam -> Magaram).
//   - Dual (Mithunam/Kanni/Dhanusu/Meenam): starts from the 5th sign from
//     itself (e.g. Mithunam -> Thulam).
// The formula below is the standard single-expression equivalent used
// across Vedic astrology software; it reproduces all three rules exactly
// (verified by hand for one sign of each modality — e.g. signIndex=1
// (Rishabam/Taurus) gives navamsa 0 -> signIndex 9 (Magaram/Capricorn),
// matching the fixed-sign rule above).
function navamsaSignIndex(signIndex: number, degreeInSign: number): number {
  const navamsaIndex = Math.min(NAVAMSA_DIVISIONS - 1, Math.floor(degreeInSign / NAVAMSA_SPAN_DEGREES));
  return (signIndex * NAVAMSA_DIVISIONS + navamsaIndex) % 12;
}

export const navamsaCalculator: DivisionalChartCalculator = {
  divisions: NAVAMSA_DIVISIONS,
  computeSignIndex: navamsaSignIndex,
};
