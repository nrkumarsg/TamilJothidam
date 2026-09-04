import { CalculationService } from '../../src/calculation/calculation.service';
import { EphemerisService } from '../../src/calculation/ephemeris.service';
import { ChartCalculationResult, GrahaResult } from '../../src/calculation/calculation.types';
import { REFERENCE_CHARTS, ReferenceChart } from './reference-charts';

// Phase 19 regression suite, engine level — pure and fast (no database, no
// HTTP), running the real Swiss Ephemeris against every reference chart.
//
// The properties asserted here must hold for ANY birth data, not just the
// one chart earlier phases verified by hand. That is the point: a chart
// nobody hand-checked can still prove the engine self-consistent, and these
// catch whole classes of error (bad timezone conversion, a broken nakshatra
// boundary, houses drifting out of step with the Lagna) on inputs the
// canonical Chennai chart never exercises.
//
// Everything below is re-derived from first principles inside the test
// rather than by calling the same derivation helpers the engine uses —
// checking f against f would prove nothing.
const NAKSHATRA_SPAN = 360 / 27;
const PADA_SPAN = NAKSHATRA_SPAN / 4;

const service = new CalculationService(new EphemerisService());

function chartFor(chart: ReferenceChart): ChartCalculationResult {
  return service.computeChart({
    dateOfBirth: chart.dateOfBirth,
    timeOfBirth: chart.timeOfBirth,
    timezone: chart.location.timezone,
    latitude: chart.location.latitude,
    longitude: chart.location.longitude,
  });
}

function allBodies(result: ChartCalculationResult): GrahaResult[] {
  return [result.lagna, ...result.planets];
}

describe('Engine regression: invariants across every reference chart', () => {
  describe.each(REFERENCE_CHARTS.map((c) => [c.key, c] as const))('%s', (_key, chart) => {
    const result = chartFor(chart);

    it('is deterministic — the same input twice produces identical output', () => {
      expect(chartFor(chart)).toEqual(result);
    });

    it('returns exactly the 9 grahas plus the Lagna, with no duplicates', () => {
      expect(result.planets).toHaveLength(9);
      expect(result.lagna.graha).toBe('LAGNA');
      const grahas = result.planets.map((p) => p.graha);
      expect(new Set(grahas).size).toBe(9);
      expect(grahas).not.toContain('LAGNA');
    });

    it('keeps every longitude, sign, nakshatra, pada and house within its valid range', () => {
      for (const body of allBodies(result)) {
        expect(body.longitude).toBeGreaterThanOrEqual(0);
        expect(body.longitude).toBeLessThan(360);
        expect(body.signIndex).toBeGreaterThanOrEqual(0);
        expect(body.signIndex).toBeLessThanOrEqual(11);
        expect(body.degreeInSign).toBeGreaterThanOrEqual(0);
        expect(body.degreeInSign).toBeLessThan(30);
        expect(body.nakshatra).toBeGreaterThanOrEqual(1);
        expect(body.nakshatra).toBeLessThanOrEqual(27);
        expect(body.pada).toBeGreaterThanOrEqual(1);
        expect(body.pada).toBeLessThanOrEqual(4);
        expect(body.house).toBeGreaterThanOrEqual(1);
        expect(body.house).toBeLessThanOrEqual(12);
      }
    });

    it('derives sign, degree, nakshatra and pada consistently with the raw longitude', () => {
      for (const body of allBodies(result)) {
        expect(body.signIndex).toBe(Math.floor(body.longitude / 30));
        expect(body.degreeInSign).toBeCloseTo(body.longitude % 30, 6);
        expect(body.nakshatra).toBe(Math.floor(body.longitude / NAKSHATRA_SPAN) + 1);
        expect(body.pada).toBe(Math.floor((body.longitude % NAKSHATRA_SPAN) / PADA_SPAN) + 1);
      }
    });

    it('places every body in the whole-sign house counted from the Lagna', () => {
      const lagnaSign = result.lagna.signIndex;
      for (const body of allBodies(result)) {
        const expectedHouse = ((body.signIndex - lagnaSign + 12) % 12) + 1;
        expect(body.house).toBe(expectedHouse);
      }
      // The Lagna itself always sits in house 1, by definition.
      expect(result.lagna.house).toBe(1);
    });

    it('keeps Ketu exactly 180° opposite Rahu', () => {
      const rahu = result.planets.find((p) => p.graha === 'RAHU')!;
      const ketu = result.planets.find((p) => p.graha === 'KETU')!;
      const separation = (ketu.longitude - rahu.longitude + 360) % 360;
      expect(separation).toBeCloseTo(180, 6);
    });

    it('moves Rahu and Ketu in the same direction, and never retrogrades the luminaries', () => {
      // Rahu and Ketu are two ends of one axis, so their direction always
      // matches — this also guards the Ketu derivation, which copies
      // Rahu's speed (ephemeris.service.ts).
      //
      // Note what is deliberately NOT asserted: that the nodes are always
      // retrograde. That holds for the MEAN node; this engine uses the
      // TRUE node (see ephemeris.service.ts), which really does turn
      // direct for short stretches — two of the six reference charts below
      // catch it mid-direct. The dedicated test further down pins that
      // choice explicitly.
      const rahu = result.planets.find((p) => p.graha === 'RAHU')!;
      const ketu = result.planets.find((p) => p.graha === 'KETU')!;
      expect(ketu.retrograde).toBe(rahu.retrograde);

      // The Sun and Moon can never appear retrograde from Earth.
      expect(result.planets.find((p) => p.graha === 'SUN')!.retrograde).toBe(false);
      expect(result.planets.find((p) => p.graha === 'MOON')!.retrograde).toBe(false);
    });

    it('never marks the Sun combust by its own light', () => {
      expect(result.planets.find((p) => p.graha === 'SUN')!.combust).toBe(false);
    });

    it('puts the sidereal Sun in the sign the date alone implies', () => {
      // Derived from the calendar, independently of this engine — see
      // reference-charts.ts's expectedSunSignIndex.
      const sun = result.planets.find((p) => p.graha === 'SUN')!;
      expect(sun.signIndex).toBe(chart.expectedSunSignIndex);
    });

    it('records a plausible Lahiri ayanamsa for the era', () => {
      // Lahiri ayanamsa passes ~23.5° around 1975 and drifts ~50"/year, so
      // every chart here (1975-2010) must land in a narrow band. A wrong
      // ayanamsa would silently shift every single position.
      expect(result.ayanamsaDegrees).toBeGreaterThan(23.3);
      expect(result.ayanamsaDegrees).toBeLessThan(24.2);
    });
  });
});

describe('Engine regression: the lunar node model', () => {
  it('uses the TRUE node, which turns direct sometimes — not the always-retrograde mean node', () => {
    // A regression guard on a deliberate modelling choice
    // (ephemeris.service.ts picks SE_TRUE_NODE). Swapping to the mean node
    // would make Rahu retrograde in every chart ever cast, silently
    // changing output everywhere; this fails loudly if that happens.
    const rahuDirections = REFERENCE_CHARTS.map(
      (chart) => chartFor(chart).planets.find((p) => p.graha === 'RAHU')!.retrograde,
    );
    expect(rahuDirections).toContain(true);
    expect(rahuDirections).toContain(false);
  });
});

describe('Engine regression: timezone and location handling', () => {
  // The exact bug class caught by hand in Phase 4 — the engine once treated
  // local wall-clock digits as if they were already UTC, so two very
  // different instants produced identical charts.
  it('produces different charts for the same wall-clock time in different time zones', () => {
    const chennai = service.computeChart({
      dateOfBirth: '1990-01-15',
      timeOfBirth: '08:30',
      timezone: 'Asia/Kolkata',
      latitude: 13.0827,
      longitude: 80.2707,
    });
    const newYork = service.computeChart({
      dateOfBirth: '1990-01-15',
      timeOfBirth: '08:30',
      timezone: 'America/New_York',
      latitude: 13.0827,
      longitude: 80.2707, // deliberately identical coordinates: only the zone differs
    });

    expect(newYork.julianDayUt).not.toBeCloseTo(chennai.julianDayUt, 6);
    const chennaiMoon = chennai.planets.find((p) => p.graha === 'MOON')!.longitude;
    const newYorkMoon = newYork.planets.find((p) => p.graha === 'MOON')!.longitude;
    expect(newYorkMoon).not.toBeCloseTo(chennaiMoon, 3);
  });

  it('gives the same planetary longitudes but a different Lagna for the same instant seen from two places', () => {
    // 06:00 in London and 11:30 in Chennai on the same date are the SAME
    // UTC instant. Planets are where they are regardless of who is looking;
    // only the ascendant depends on the observer's position.
    const london = service.computeChart({
      dateOfBirth: '2000-11-05',
      timeOfBirth: '06:00',
      timezone: 'Europe/London',
      latitude: 51.5072,
      longitude: -0.1276,
    });
    const chennai = service.computeChart({
      dateOfBirth: '2000-11-05',
      timeOfBirth: '11:30',
      timezone: 'Asia/Kolkata',
      latitude: 13.0827,
      longitude: 80.2707,
    });

    expect(london.julianDayUt).toBeCloseTo(chennai.julianDayUt, 9);
    for (const graha of ['SUN', 'MOON', 'MARS', 'JUPITER', 'SATURN'] as const) {
      const a = london.planets.find((p) => p.graha === graha)!.longitude;
      const b = chennai.planets.find((p) => p.graha === graha)!.longitude;
      expect(a).toBeCloseTo(b, 9);
    }
    expect(london.lagna.longitude).not.toBeCloseTo(chennai.lagna.longitude, 3);
  });

  it('advances the Moon roughly 13° per day, the classical rate', () => {
    const day1 = service.computeChart({
      dateOfBirth: '1990-01-15',
      timeOfBirth: '12:00',
      timezone: 'UTC',
      latitude: 0,
      longitude: 0,
    });
    const day2 = service.computeChart({
      dateOfBirth: '1990-01-16',
      timeOfBirth: '12:00',
      timezone: 'UTC',
      latitude: 0,
      longitude: 0,
    });

    const moon1 = day1.planets.find((p) => p.graha === 'MOON')!.longitude;
    const moon2 = day2.planets.find((p) => p.graha === 'MOON')!.longitude;
    const travelled = (moon2 - moon1 + 360) % 360;
    // The Moon covers 360° in ~27.3 days => ~13.2°/day, varying with its
    // elliptical orbit (roughly 12°-15°).
    expect(travelled).toBeGreaterThan(11);
    expect(travelled).toBeLessThan(16);
  });
});
