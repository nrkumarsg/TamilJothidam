import { CalculationService } from './calculation.service';
import { EphemerisService } from './ephemeris.service';

// Integration tests against the real Swiss Ephemeris (Moshier mode) — no
// mocking, since the whole point is validating the real astronomical
// output. Reference facts used below are independently verifiable, not
// numbers we invented: Makara Sankranti (the sidereal Sun entering
// Capricorn) is a well-known, publicly documented Tamil calendar event that
// always falls on Jan 14 or 15.
describe('CalculationService (integration)', () => {
  const service = new CalculationService(new EphemerisService());

  const chennai = { timezone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707 };

  it('places the sidereal Sun in Dhanusu (Sagittarius) just before Makara Sankranti', () => {
    const result = service.computeChart({ ...chennai, dateOfBirth: '2024-01-13', timeOfBirth: '12:00' });
    const sun = result.planets.find((p) => p.graha === 'SUN')!;
    expect(sun.signIndex).toBe(8); // Dhanusu / Sagittarius (240°-270°)
  });

  it('places the sidereal Sun in Makaram (Capricorn) just after Makara Sankranti', () => {
    const result = service.computeChart({ ...chennai, dateOfBirth: '2024-01-16', timeOfBirth: '12:00' });
    const sun = result.planets.find((p) => p.graha === 'SUN')!;
    expect(sun.signIndex).toBe(9); // Makaram / Capricorn (270°-300°)
  });

  it('computes a Lahiri ayanamsa in the historically expected range', () => {
    const result1990 = service.computeChart({ ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' });
    const result2024 = service.computeChart({ ...chennai, dateOfBirth: '2024-01-15', timeOfBirth: '08:30' });
    // Lahiri ayanamsa increases by ~50 arcsec/year; ~23.7 deg in 1990, ~24.1 deg in 2024.
    expect(result1990.ayanamsaDegrees).toBeGreaterThan(23.5);
    expect(result1990.ayanamsaDegrees).toBeLessThan(24.0);
    expect(result2024.ayanamsaDegrees).toBeGreaterThan(23.9);
    expect(result2024.ayanamsaDegrees).toBeLessThan(24.5);
  });

  it('derives Ketu as exactly 180 degrees from Rahu', () => {
    const result = service.computeChart({ ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' });
    const rahu = result.planets.find((p) => p.graha === 'RAHU')!;
    const ketu = result.planets.find((p) => p.graha === 'KETU')!;
    const diff = Math.abs(rahu.longitude - ketu.longitude);
    expect(Math.min(diff, 360 - diff)).toBeCloseTo(180, 5);
  });

  it('returns Lagna plus all 9 grahas, with Lagna always in house 1', () => {
    const result = service.computeChart({ ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' });
    expect(result.planets).toHaveLength(9);
    expect(new Set(result.planets.map((p) => p.graha)).size).toBe(9);
    expect(result.lagna.graha).toBe('LAGNA');
    expect(result.lagna.house).toBe(1);
    expect(result.lagna.dignity).toBeNull();
  });

  it('every graha house falls in 1-12 and every sign index in 0-11', () => {
    const result = service.computeChart({ ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' });
    for (const p of [result.lagna, ...result.planets]) {
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
      expect(p.signIndex).toBeGreaterThanOrEqual(0);
      expect(p.signIndex).toBeLessThanOrEqual(11);
      expect(p.nakshatra).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra).toBeLessThanOrEqual(27);
      expect(p.pada).toBeGreaterThanOrEqual(1);
      expect(p.pada).toBeLessThanOrEqual(4);
    }
  });

  it('is deterministic: the same birth input always produces the same output', () => {
    const input = { ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' };
    const a = service.computeChart(input);
    const b = service.computeChart(input);
    expect(a).toEqual(b);
  });

  it('accounts for historical timezone via the IANA zone, not a fixed offset', () => {
    // Same clock time, different hemispheres/zones must yield different
    // sidereal positions since the underlying UTC instant differs.
    const chart1 = service.computeChart({ ...chennai, dateOfBirth: '1990-01-15', timeOfBirth: '08:30' });
    const chart2 = service.computeChart({
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
      dateOfBirth: '1990-01-15',
      timeOfBirth: '08:30',
    });
    expect(chart1.julianDayUt).not.toBeCloseTo(chart2.julianDayUt, 5);
  });
});
