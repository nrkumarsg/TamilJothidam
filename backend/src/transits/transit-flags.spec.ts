import { isAshtamaShani, isJanmaShani, sadeSatiPhase } from './transit-flags';

describe('sadeSatiPhase', () => {
  it('identifies the rising phase (12th from Moon)', () => {
    expect(sadeSatiPhase(12)).toBe('RISING');
  });
  it('identifies the peak phase (1st from Moon, i.e. Moon\'s own sign)', () => {
    expect(sadeSatiPhase(1)).toBe('PEAK');
  });
  it('identifies the setting phase (2nd from Moon)', () => {
    expect(sadeSatiPhase(2)).toBe('SETTING');
  });
  it('returns null outside the 12th/1st/2nd houses from Moon', () => {
    for (const house of [3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(sadeSatiPhase(house)).toBeNull();
    }
  });
});

describe('isAshtamaShani', () => {
  it('is true only for the 8th house from Moon', () => {
    expect(isAshtamaShani(8)).toBe(true);
    for (const house of [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12]) {
      expect(isAshtamaShani(house)).toBe(false);
    }
  });
});

describe('isJanmaShani', () => {
  it('is true only for the 1st house from Moon, matching Sade Sati PEAK', () => {
    expect(isJanmaShani(1)).toBe(true);
    expect(sadeSatiPhase(1)).toBe('PEAK');
  });
  it('is false elsewhere', () => {
    for (const house of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      expect(isJanmaShani(house)).toBe(false);
    }
  });
});
