import {
  angularSeparation,
  determineDignity,
  houseFromSign,
  isCombust,
  longitudeToNakshatraPada,
  longitudeToSign,
  normalizeDegrees,
  simplifiedStrengthScore,
} from './derivation';

describe('normalizeDegrees', () => {
  it('wraps negative and >360 values into [0,360)', () => {
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(400)).toBe(40);
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(360)).toBe(0);
  });
});

describe('angularSeparation', () => {
  it('returns the shortest angular distance, always <= 180', () => {
    expect(angularSeparation(10, 20)).toBe(10);
    expect(angularSeparation(350, 10)).toBe(20);
    expect(angularSeparation(0, 180)).toBe(180);
  });
});

describe('longitudeToSign', () => {
  it('maps longitude to the correct 30-degree sign bucket', () => {
    expect(longitudeToSign(0)).toEqual({ signIndex: 0, degreeInSign: 0 });
    expect(longitudeToSign(29.99)).toEqual({ signIndex: 0, degreeInSign: 29.99 });
    expect(longitudeToSign(30)).toEqual({ signIndex: 1, degreeInSign: 0 });
    const last = longitudeToSign(359.99);
    expect(last.signIndex).toBe(11);
    expect(last.degreeInSign).toBeCloseTo(29.99, 9);
  });
});

describe('longitudeToNakshatraPada', () => {
  it('maps longitude to the correct nakshatra (13°20\' spans) and pada (3°20\' spans)', () => {
    expect(longitudeToNakshatraPada(0)).toEqual({ nakshatra: 1, pada: 1 });
    expect(longitudeToNakshatraPada(3)).toEqual({ nakshatra: 1, pada: 1 });
    expect(longitudeToNakshatraPada(5)).toEqual({ nakshatra: 1, pada: 2 });
    expect(longitudeToNakshatraPada(13.4)).toEqual({ nakshatra: 2, pada: 1 });
    expect(longitudeToNakshatraPada(359.9)).toEqual({ nakshatra: 27, pada: 4 });
  });
});

describe('houseFromSign (whole-sign houses)', () => {
  it('places the graha in house 1 when its sign matches the lagna sign', () => {
    expect(houseFromSign(4, 4)).toBe(1);
  });

  it('counts forward through the signs from the lagna', () => {
    expect(houseFromSign(1, 0)).toBe(2);
    expect(houseFromSign(0, 5)).toBe(8); // wraps around the zodiac
  });
});

describe('determineDignity', () => {
  it('detects exaltation and debilitation', () => {
    expect(determineDignity('SUN', 0)).toBe('EXALTED'); // Aries
    expect(determineDignity('SUN', 6)).toBe('DEBILITATED'); // Libra, opposite Aries
  });

  it('detects own sign', () => {
    expect(determineDignity('SUN', 4)).toBe('OWN_SIGN'); // Leo
    expect(determineDignity('SATURN', 9)).toBe('OWN_SIGN'); // Capricorn
    expect(determineDignity('SATURN', 10)).toBe('OWN_SIGN'); // Aquarius
  });

  it('detects friendly and enemy signs via the sign lord', () => {
    expect(determineDignity('SUN', 3)).toBe('FRIENDLY'); // Cancer, lord Moon (Sun's friend)
    expect(determineDignity('SUN', 1)).toBe('ENEMY'); // Taurus, lord Venus (Sun's enemy)
  });

  it('falls back to neutral', () => {
    expect(determineDignity('SUN', 2)).toBe('NEUTRAL'); // Gemini, lord Mercury (neutral to Sun)
  });

  it('returns null for Rahu, Ketu and Lagna (contested/not-applicable natural relationships)', () => {
    expect(determineDignity('RAHU', 0)).toBeNull();
    expect(determineDignity('KETU', 0)).toBeNull();
    expect(determineDignity('LAGNA', 0)).toBeNull();
  });
});

describe('isCombust', () => {
  it('is true within the classical orb and false outside it', () => {
    expect(isCombust('MERCURY', 100, 95, false)).toBe(true); // 5° separation, orb 14°
    expect(isCombust('MERCURY', 130, 95, false)).toBe(false); // 35° separation
  });

  it('uses the tighter retrograde orb when the graha is retrograde', () => {
    expect(isCombust('MERCURY', 108, 95, false)).toBe(true); // 13°, within direct orb 14
    expect(isCombust('MERCURY', 108, 95, true)).toBe(false); // 13°, outside retrograde orb 12
  });

  it('is never true for the Sun itself, Rahu or Ketu', () => {
    expect(isCombust('SUN', 95, 95, false)).toBe(false);
    expect(isCombust('RAHU', 95, 95, false)).toBe(false);
    expect(isCombust('KETU', 95, 95, false)).toBe(false);
  });
});

describe('simplifiedStrengthScore', () => {
  it('maps dignity to a [0,1] proxy score', () => {
    expect(simplifiedStrengthScore('EXALTED')).toBe(1.0);
    expect(simplifiedStrengthScore('DEBILITATED')).toBe(0.0);
    expect(simplifiedStrengthScore(null)).toBeNull();
  });
});
