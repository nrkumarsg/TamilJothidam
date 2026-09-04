import { MahadashaWithAntardashas, buildDashaTimeline, describePalanPeriod } from './palan-period.types';

// Hand-built fixture, not derived from the real dasha engine — only the
// date-range filtering/truncation logic in buildDashaTimeline is under
// test here, so simple round dates make the expected boundaries easy to
// verify by hand.
const FIXTURE: MahadashaWithAntardashas[] = [
  {
    graha: 'KETU',
    startDate: '1990-01-15',
    endDate: '1997-01-15',
    antardashas: [
      { graha: 'KETU', startDate: '1990-01-15', endDate: '1990-11-15' },
      { graha: 'VENUS', startDate: '1990-11-15', endDate: '1997-01-15' },
    ],
  },
  {
    graha: 'VENUS',
    startDate: '1997-01-15',
    endDate: '2017-01-15',
    antardashas: [
      { graha: 'VENUS', startDate: '1997-01-15', endDate: '2000-01-15' },
      { graha: 'SUN', startDate: '2000-01-15', endDate: '2017-01-15' },
    ],
  },
  {
    graha: 'SUN',
    startDate: '2017-01-15',
    endDate: '2023-01-15',
    antardashas: [
      { graha: 'SUN', startDate: '2017-01-15', endDate: '2017-07-15' },
      { graha: 'MOON', startDate: '2017-07-15', endDate: '2023-01-15' },
    ],
  },
  {
    graha: 'MOON',
    startDate: '2023-01-15',
    endDate: '2033-01-15',
    antardashas: [
      { graha: 'MOON', startDate: '2023-01-15', endDate: '2024-07-15' },
      { graha: 'MARS', startDate: '2024-07-15', endDate: '2033-01-15' },
    ],
  },
  {
    graha: 'MARS',
    startDate: '2033-01-15',
    endDate: '2040-01-15',
    antardashas: [{ graha: 'MARS', startDate: '2033-01-15', endDate: '2040-01-15' }],
  },
] as MahadashaWithAntardashas[];

const ASOF = new Date('2020-06-01T00:00:00.000Z');

describe('buildDashaTimeline', () => {
  it('CURRENT mode returns an empty timeline regardless of input', () => {
    expect(buildDashaTimeline(FIXTURE, { mode: 'CURRENT' }, ASOF)).toEqual([]);
  });

  it('WHOLE_LIFE mode returns the full list unchanged', () => {
    expect(buildDashaTimeline(FIXTURE, { mode: 'WHOLE_LIFE' }, ASOF)).toEqual(FIXTURE);
  });

  it('NEXT_YEARS filters mahadashas and antardashas to the [asOf, asOf+years] window', () => {
    // asOf=2020-06-01, years=5 -> window ends 2025-06-01. Hand-verified:
    // KETU/VENUS mahadashas fully precede asOf (excluded); SUN (2017-2023)
    // overlaps asOf, keeping only its MOON antardasha (its own SUN
    // antardasha ends 2017-07-15, before asOf); MOON (2023-2033) overlaps
    // the window and keeps both antardashas (MARS antardasha starts
    // 2024-07-15, before windowEnd); MARS (2033-2040) starts after
    // windowEnd (excluded).
    const result = buildDashaTimeline(FIXTURE, { mode: 'NEXT_YEARS', years: 5 }, ASOF);

    expect(result.map((m) => m.graha)).toEqual(['SUN', 'MOON']);
    expect(result[0].antardashas.map((a) => a.graha)).toEqual(['MOON']);
    expect(result[1].antardashas.map((a) => a.graha)).toEqual(['MOON', 'MARS']);
  });

  it('NEXT_YEARS defaults to 5 years when years is omitted', () => {
    const withDefault = buildDashaTimeline(FIXTURE, { mode: 'NEXT_YEARS' }, ASOF);
    const explicit5 = buildDashaTimeline(FIXTURE, { mode: 'NEXT_YEARS', years: 5 }, ASOF);
    expect(withDefault).toEqual(explicit5);
  });

  it('UNTIL_DASHA truncates to the target Mahadasha inclusive, antardashas untouched', () => {
    const result = buildDashaTimeline(FIXTURE, { mode: 'UNTIL_DASHA', untilMahadashaGraha: 'SUN' }, ASOF);
    expect(result.map((m) => m.graha)).toEqual(['KETU', 'VENUS', 'SUN']);
    expect(result[2].antardashas.map((a) => a.graha)).toEqual(['SUN', 'MOON']);
  });

  it('UNTIL_DASHA additionally truncates the target Mahadasha\'s own antardashas when given', () => {
    const result = buildDashaTimeline(
      FIXTURE,
      { mode: 'UNTIL_DASHA', untilMahadashaGraha: 'SUN', untilAntardashaGraha: 'SUN' },
      ASOF,
    );
    expect(result.map((m) => m.graha)).toEqual(['KETU', 'VENUS', 'SUN']);
    expect(result[2].antardashas.map((a) => a.graha)).toEqual(['SUN']);
  });

  it('UNTIL_DASHA falls back to the full timeline when the graha is not found', () => {
    // RAHU never appears in this fixture.
    const result = buildDashaTimeline(FIXTURE, { mode: 'UNTIL_DASHA', untilMahadashaGraha: 'RAHU' }, ASOF);
    expect(result).toEqual(FIXTURE);
  });

  it('UNTIL_DASHA falls back to the full timeline when no graha is given at all', () => {
    const result = buildDashaTimeline(FIXTURE, { mode: 'UNTIL_DASHA' }, ASOF);
    expect(result).toEqual(FIXTURE);
  });
});

describe('describePalanPeriod', () => {
  it('describes CURRENT', () => {
    expect(describePalanPeriod({ mode: 'CURRENT' })).toEqual({
      ta: 'தற்போதைய தசை/புத்தி காலம் மட்டும்',
      en: 'Current dasha/bukti period only',
    });
  });

  it('describes NEXT_YEARS with an explicit year count', () => {
    expect(describePalanPeriod({ mode: 'NEXT_YEARS', years: 3 })).toEqual({
      ta: 'அடுத்த 3 ஆண்டுகள்',
      en: 'Next 3 years',
    });
  });

  it('describes NEXT_YEARS defaulting to 5 years when omitted', () => {
    expect(describePalanPeriod({ mode: 'NEXT_YEARS' })).toEqual({
      ta: 'அடுத்த 5 ஆண்டுகள்',
      en: 'Next 5 years',
    });
  });

  it('describes WHOLE_LIFE', () => {
    expect(describePalanPeriod({ mode: 'WHOLE_LIFE' })).toEqual({ ta: 'முழு ஆயுட்காலம்', en: 'Whole life' });
  });

  it('describes UNTIL_DASHA with only a Mahadasha graha, using the real Tamil graha name', () => {
    expect(describePalanPeriod({ mode: 'UNTIL_DASHA', untilMahadashaGraha: 'SATURN' })).toEqual({
      ta: 'சனி தசை வரை',
      en: 'Until Saturn Mahadasha',
    });
  });

  it('describes UNTIL_DASHA with both Mahadasha and Antardasha grahas', () => {
    expect(
      describePalanPeriod({ mode: 'UNTIL_DASHA', untilMahadashaGraha: 'SATURN', untilAntardashaGraha: 'JUPITER' }),
    ).toEqual({ ta: 'சனி தசை / குரு புத்தி வரை', en: 'Until Saturn Mahadasha / Jupiter Antardasha' });
  });

  it('describes UNTIL_DASHA with no graha given at all as a generic fallback', () => {
    expect(describePalanPeriod({ mode: 'UNTIL_DASHA' })).toEqual({
      ta: 'குறிப்பிட்ட தசை வரை',
      en: 'Until a specific dasha',
    });
  });
});
