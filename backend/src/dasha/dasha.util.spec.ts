import { buildDashaTree, jdToDate } from './dasha.util';
import { DASHA_ORDER, DASHA_YEARS, DAYS_PER_YEAR, nakshatraLordGraha, yearsOf } from './vimshottari-reference';

const BIRTH_JD = 2447906.625; // arbitrary reference instant (1990-01-15 ~03:00 UT)

describe('vimshottari-reference', () => {
  it('DASHA_YEARS sums to exactly 120', () => {
    const total = Object.values(DASHA_YEARS).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(120);
  });

  it('nakshatra lords cycle through the 9 grahas 3 times across 27 nakshatras', () => {
    expect(nakshatraLordGraha(1)).toBe('KETU'); // Ashwini
    expect(nakshatraLordGraha(9)).toBe('MERCURY'); // Ashlesha
    expect(nakshatraLordGraha(10)).toBe('KETU'); // Magha — cycle restarts
    expect(nakshatraLordGraha(27)).toBe('MERCURY'); // Revati
  });
});

describe('buildDashaTree', () => {
  it('starts the first Mahadasha at the nakshatra lord', () => {
    const tree = buildDashaTree(1, 0, BIRTH_JD); // nakshatra 1 (Ashwini) -> Ketu
    expect(tree[0].graha).toBe('KETU');
  });

  it('gives a FULL first Mahadasha when the Moon is at the exact start of its nakshatra (elapsedFraction = 0)', () => {
    // Nakshatra 1 starts at longitude 0.
    const tree = buildDashaTree(1, 0, BIRTH_JD);
    const first = tree[0];
    const expectedFullDays = yearsOf('KETU') * DAYS_PER_YEAR;
    expect(first.endJd - first.startJd).toBeCloseTo(expectedFullDays, 6);
    // With zero elapsed time, the first Antardasha is also full and is the
    // Mahadasha lord's own antardasha (Ketu-Ketu).
    expect(first.children[0].graha).toBe('KETU');
    const expectedFirstAntarDays = (expectedFullDays * yearsOf('KETU')) / 120;
    expect(first.children[0].endJd - first.children[0].startJd).toBeCloseTo(expectedFirstAntarDays, 6);
  });

  it('truncates the first Mahadasha to its balance when the Moon is partway through its nakshatra', () => {
    const nakshatraSpan = 360 / 27;
    // Halfway through nakshatra 1 (Ketu, 7 years) -> 3.5 years balance.
    const halfwayLongitude = nakshatraSpan / 2;
    const tree = buildDashaTree(1, halfwayLongitude, BIRTH_JD);
    const first = tree[0];
    expect(first.graha).toBe('KETU');
    const expectedBalanceDays = 3.5 * DAYS_PER_YEAR;
    expect(first.endJd - first.startJd).toBeCloseTo(expectedBalanceDays, 3);
  });

  it('skips early antardashas that fall entirely before birth when elapsed fraction is large', () => {
    const nakshatraSpan = 360 / 27;
    // 99% through the nakshatra -> only 1% of the 7-year Ketu Mahadasha
    // remains (~25.6 days). Ketu's own antardasha within itself is
    // 7*7/120 ~ 0.408 years (~149 days), far larger than the remaining
    // balance, so it must be skipped entirely and we land in a later
    // antardasha in the KETU-starting sequence.
    const longitude = nakshatraSpan * 0.99;
    const tree = buildDashaTree(1, longitude, BIRTH_JD);
    const first = tree[0];
    expect(first.children[0].graha).not.toBe('KETU');
    expect(first.children.length).toBeGreaterThan(0);
  });

  it('every Mahadasha antardasha durations sum exactly to the Mahadasha duration', () => {
    const tree = buildDashaTree(14, 180, BIRTH_JD); // arbitrary nakshatra/longitude
    for (const maha of tree) {
      const mahaDuration = maha.endJd - maha.startJd;
      const childrenSum = maha.children.reduce((sum, c) => sum + (c.endJd - c.startJd), 0);
      expect(childrenSum).toBeCloseTo(mahaDuration, 6);
    }
  });

  it('every antardasha pratyantardasha durations sum exactly to the antardasha duration', () => {
    const tree = buildDashaTree(14, 180, BIRTH_JD);
    for (const maha of tree) {
      for (const antar of maha.children) {
        const antarDuration = antar.endJd - antar.startJd;
        const grandchildrenSum = antar.children.reduce((sum, c) => sum + (c.endJd - c.startJd), 0);
        expect(grandchildrenSum).toBeCloseTo(antarDuration, 6);
      }
    }
  });

  it('every Mahadasha has exactly 9 antardashas, and every antardasha exactly 9 pratyantardashas', () => {
    const tree = buildDashaTree(1, 0, BIRTH_JD); // elapsedFraction=0, nothing skipped
    for (const maha of tree) {
      expect(maha.children).toHaveLength(9);
      for (const antar of maha.children) {
        expect(antar.children).toHaveLength(9);
      }
    }
  });

  it('generates a contiguous timeline with no gaps or overlaps between Mahadashas', () => {
    const tree = buildDashaTree(5, 60, BIRTH_JD);
    for (let i = 1; i < tree.length; i++) {
      expect(tree[i].startJd).toBeCloseTo(tree[i - 1].endJd, 9);
    }
  });

  it('covers at least 120 years from birth', () => {
    const tree = buildDashaTree(5, 60, BIRTH_JD);
    const last = tree[tree.length - 1];
    const totalDays = last.endJd - BIRTH_JD;
    expect(totalDays).toBeGreaterThanOrEqual(120 * DAYS_PER_YEAR);
  });

  it('cycles through DASHA_ORDER for successive Mahadashas', () => {
    const tree = buildDashaTree(1, 0, BIRTH_JD);
    for (let i = 1; i < tree.length; i++) {
      const prevIndex = DASHA_ORDER.indexOf(tree[i - 1].graha);
      const expectedNext = DASHA_ORDER[(prevIndex + 1) % 9];
      expect(tree[i].graha).toBe(expectedNext);
    }
  });
});

describe('jdToDate', () => {
  it('converts the Unix epoch Julian Day correctly', () => {
    expect(jdToDate(2440587.5).toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('converts a later date correctly', () => {
    // 2440587.5 + 1 day = 1970-01-02
    expect(jdToDate(2440588.5).toISOString()).toBe('1970-01-02T00:00:00.000Z');
  });
});
