import {
  HOUSE_SIGNIFICATIONS,
  aspectedHouses,
  isNaturalBenefic,
  isNaturalMalefic,
} from './house-analysis';

describe('HOUSE_SIGNIFICATIONS', () => {
  it('has exactly 12 entries with non-empty ta/en labels', () => {
    expect(HOUSE_SIGNIFICATIONS).toHaveLength(12);
    for (const s of HOUSE_SIGNIFICATIONS) {
      expect(s.ta.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
    }
  });
});

describe('aspectedHouses', () => {
  it('gives every graha the universal 7th-house aspect', () => {
    for (const graha of ['SUN', 'MOON', 'MERCURY', 'VENUS', 'RAHU', 'KETU'] as const) {
      expect(aspectedHouses(graha, 1)).toEqual([7]);
      expect(aspectedHouses(graha, 10)).toEqual([4]);
    }
  });

  it("gives Mars its special 4th and 8th aspects in addition to the 7th", () => {
    expect(aspectedHouses('MARS', 1)).toEqual([4, 7, 8]);
    expect(aspectedHouses('MARS', 9)).toEqual([12, 3, 4]); // 4th=12,7th=3,8th=4 from house9
  });

  it("gives Jupiter its special 5th and 9th aspects in addition to the 7th", () => {
    expect(aspectedHouses('JUPITER', 1)).toEqual([5, 7, 9]);
  });

  it("gives Saturn its special 3rd and 10th aspects in addition to the 7th", () => {
    expect(aspectedHouses('SATURN', 1)).toEqual([3, 7, 10]);
  });

  it('wraps around the zodiac correctly', () => {
    // From house 9, the 10th-house-counted aspect (Saturn) lands on house 6.
    expect(aspectedHouses('SATURN', 9)).toContain(6);
  });

  it('returns an empty array for Lagna (not a graha with drishti)', () => {
    expect(aspectedHouses('LAGNA', 1)).toEqual([]);
  });
});

describe('benefic/malefic classification', () => {
  it('classifies Sun, Mars, Saturn, Rahu, Ketu as malefic', () => {
    for (const graha of ['SUN', 'MARS', 'SATURN', 'RAHU', 'KETU'] as const) {
      expect(isNaturalMalefic(graha)).toBe(true);
      expect(isNaturalBenefic(graha)).toBe(false);
    }
  });

  it('classifies Moon, Mercury, Jupiter, Venus as benefic', () => {
    for (const graha of ['MOON', 'MERCURY', 'JUPITER', 'VENUS'] as const) {
      expect(isNaturalBenefic(graha)).toBe(true);
      expect(isNaturalMalefic(graha)).toBe(false);
    }
  });
});
