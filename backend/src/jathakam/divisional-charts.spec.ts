import { navamsaCalculator } from './divisional-charts';

// Classical starting sign for each rasi's first navamsa (BPHS ch. 6):
// movable signs start from themselves, fixed signs from the 9th sign from
// themselves, dual signs from the 5th sign from themselves. Table below is
// derived by hand from that rule, independent of the formula under test.
const EXPECTED_FIRST_NAVAMSA_SIGN = [
  0, // 0 Mesham (movable) -> starts at itself: Mesham
  9, // 1 Rishabam (fixed) -> 9th from itself: Magaram
  6, // 2 Mithunam (dual) -> 5th from itself: Thulam
  3, // 3 Kadagam (movable) -> itself: Kadagam
  0, // 4 Simmam (fixed) -> 9th from itself: Mesham
  9, // 5 Kanni (dual) -> 5th from itself: Magaram
  6, // 6 Thulam (movable) -> itself: Thulam
  3, // 7 Viruchigam (fixed) -> 9th from itself: Kadagam
  0, // 8 Dhanusu (dual) -> 5th from itself: Mesham
  9, // 9 Magaram (movable) -> itself: Magaram
  6, // 10 Kumbam (fixed) -> 9th from itself: Thulam
  3, // 11 Meenam (dual) -> 5th from itself: Kadagam
];

describe('navamsaCalculator', () => {
  it('reproduces the classical per-modality starting sign for every rasi', () => {
    for (let signIndex = 0; signIndex < 12; signIndex++) {
      const firstNavamsaSign = navamsaCalculator.computeSignIndex(signIndex, 0);
      expect(firstNavamsaSign).toBe(EXPECTED_FIRST_NAVAMSA_SIGN[signIndex]);
    }
  });

  it('advances one sign per 3°20\' division within a rasi', () => {
    // Aries (movable, starts at itself): navamsas run Aries..Sagittarius.
    expect(navamsaCalculator.computeSignIndex(0, 0)).toBe(0); // 0°-3°20' -> Aries
    expect(navamsaCalculator.computeSignIndex(0, 3.34)).toBe(1); // Taurus
    expect(navamsaCalculator.computeSignIndex(0, 29.9)).toBe(8); // Sagittarius, last division
  });

  it('wraps around the zodiac correctly', () => {
    // Pisces (signIndex 11) at its last navamsa: (11*9 + 8) % 12 = 107 % 12 = 11 -> Pisces
    expect(navamsaCalculator.computeSignIndex(11, 29.9)).toBe(11);
  });

  it('has 9 divisions', () => {
    expect(navamsaCalculator.divisions).toBe(9);
  });
});
