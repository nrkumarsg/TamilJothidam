import { NAKSHATRA_NAMES, SIGN_NAMES, nakshatraName, signName } from './names';

describe('names', () => {
  it('has exactly 12 signs and 27 nakshatras, each with non-empty ta/en labels', () => {
    expect(SIGN_NAMES).toHaveLength(12);
    expect(NAKSHATRA_NAMES).toHaveLength(27);
    for (const s of SIGN_NAMES) {
      expect(s.ta.length).toBeGreaterThan(0);
      expect(s.en.length).toBeGreaterThan(0);
    }
    for (const n of NAKSHATRA_NAMES) {
      expect(n.ta.length).toBeGreaterThan(0);
      expect(n.en.length).toBeGreaterThan(0);
    }
  });

  it('signName indexes 0-based (0=Mesham/Aries, 11=Meenam/Pisces)', () => {
    expect(signName(0)).toEqual({ ta: 'மேஷம்', en: 'Aries' });
    expect(signName(11)).toEqual({ ta: 'மீனம்', en: 'Pisces' });
  });

  it('nakshatraName indexes 1-based (1=Ashwini, 27=Revati)', () => {
    expect(nakshatraName(1)).toEqual({ ta: 'அஸ்வினி', en: 'Ashwini' });
    expect(nakshatraName(27)).toEqual({ ta: 'ரேவதி', en: 'Revati' });
  });
});
