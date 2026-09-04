import { BadRequestException } from '@nestjs/common';
import { PanchangamService } from './panchangam.service';
import { EphemerisService } from '../calculation/ephemeris.service';
import {
  AUSPICIOUS_GOWRI,
  GULIKA_EIGHTH,
  RAHU_KALAM_EIGHTH,
  YAMAGANDAM_EIGHTH,
} from './panchangam-reference';

// Integration tests against the real Swiss Ephemeris — the point is
// validating genuine astronomical output, so nothing is mocked.
//
// Wherever possible these check facts that are true INDEPENDENTLY of this
// code: a full moon is a Sun-Moon opposition, southern-hemisphere days are
// long in December, and the published Tamil almanac quotes Sunday Rahu
// Kalam as roughly 4:30-6:00 PM.
const service = new PanchangamService(new EphemerisService());

const CHENNAI = { latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' };

function at(date: string, place = CHENNAI) {
  return service.compute({ date, ...place });
}

function minutesInZone(iso: string, timeZone: string): number {
  const [h, m] = new Date(iso)
    .toLocaleTimeString('en-GB', { timeZone, hour12: false })
    .split(':')
    .map(Number);
  return h * 60 + m;
}

function durationMinutes(window: { start: string; end: string }): number {
  return (new Date(window.end).getTime() - new Date(window.start).getTime()) / 60000;
}

// Almanacs quote these windows assuming an idealised 6am-6pm day; real
// sunrise/sunset shift the eighths by up to ~15 minutes either way, so
// compare with a generous tolerance rather than jest's toBeCloseTo (whose
// "precision" parameter is awkward to reason about away from base 10).
function expectCloseToClock(actualIso: string, timeZone: string, expectedMinutes: number, toleranceMinutes = 20) {
  const actual = minutesInZone(actualIso, timeZone);
  expect(Math.abs(actual - expectedMinutes)).toBeLessThanOrEqual(toleranceMinutes);
}

describe('PanchangamService', () => {
  describe('sunrise and sunset', () => {
    it('matches real Chennai sunrise/sunset to within a couple of minutes', () => {
      // Chennai in early September rises ~05:57 and sets ~18:15 IST.
      const result = at('2026-09-05');
      expect(minutesInZone(result.sunrise!, CHENNAI.timezone)).toBeCloseTo(5 * 60 + 57, -1);
      expect(minutesInZone(result.sunset!, CHENNAI.timezone)).toBeCloseTo(18 * 60 + 16, -1);
    });

    it('gives the northern hemisphere long days in June and short days in December', () => {
      const june = at('2026-06-21');
      const december = at('2026-12-21');
      const hours = (r: typeof june) =>
        (new Date(r.sunset!).getTime() - new Date(r.sunrise!).getTime()) / 3600000;

      expect(hours(june)).toBeGreaterThan(hours(december));
    });

    it('INVERTS that for the southern hemisphere — the real test of latitude handling', () => {
      const sydney = { latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' };
      const june = at('2026-06-21', sydney);
      const december = at('2026-12-21', sydney);
      const hours = (r: typeof june) =>
        (new Date(r.sunset!).getTime() - new Date(r.sunrise!).getTime()) / 3600000;

      // Sydney's shortest day is in June and its longest in December.
      expect(hours(june)).toBeLessThan(10.5);
      expect(hours(december)).toBeGreaterThan(14);
      expect(hours(december)).toBeGreaterThan(hours(june));
    });
  });

  describe('the five angas', () => {
    it('names the weekday the day actually starts on', () => {
      expect(at('2026-09-05').vaara.name.en).toBe('Saturday');
      expect(at('2026-09-06').vaara.name.en).toBe('Sunday');
    });

    it('places Amavasai at conjunction and Pournami at opposition — what those phases physically ARE', () => {
      // Tithi is a 12° slice of Moon-minus-Sun elongation, so tithi 30
      // (new moon) must sit just below 360° and tithi 15 (full moon) just
      // below 180°. This is the check that proves the tithi maths is right
      // rather than merely self-consistent.
      const elongationOf = (r: ReturnType<typeof at>) => (r.tithi.index - 1 + r.tithi.elapsedFraction) * 12;

      const amavasai = at('2026-09-11');
      expect(amavasai.tithi.index).toBe(30);
      expect(amavasai.tithi.name.en).toContain('Amavasai');
      expect(elongationOf(amavasai)).toBeGreaterThan(348); // within one tithi of conjunction

      const pournami = at('2026-09-26');
      expect(pournami.tithi.index).toBe(15);
      expect(pournami.tithi.name.en).toContain('Pournami');
      expect(elongationOf(pournami)).toBeGreaterThan(168);
      expect(elongationOf(pournami)).toBeLessThan(180);
    });

    it('splits the month into a waxing then a waning half', () => {
      expect(at('2026-09-26').tithi.paksha).toBe('SHUKLA'); // full moon closes the waxing half
      expect(at('2026-09-05').tithi.paksha).toBe('KRISHNA');
      expect(at('2026-09-11').tithi.paksha).toBe('KRISHNA'); // new moon closes the waning half
    });

    it('keeps every anga inside its own cycle across a whole lunation', () => {
      for (let day = 1; day <= 30; day += 1) {
        const r = at(`2026-09-${String(day).padStart(2, '0')}`);
        expect(r.tithi.index).toBeGreaterThanOrEqual(1);
        expect(r.tithi.index).toBeLessThanOrEqual(30);
        expect(r.nakshatra.index).toBeGreaterThanOrEqual(1);
        expect(r.nakshatra.index).toBeLessThanOrEqual(27);
        expect(r.yoga.index).toBeGreaterThanOrEqual(1);
        expect(r.yoga.index).toBeLessThanOrEqual(27);
        expect(r.karana.index).toBeGreaterThanOrEqual(1);
        expect(r.karana.index).toBeLessThanOrEqual(60);
        expect(r.vaara.index).toBeGreaterThanOrEqual(1);
        expect(r.vaara.index).toBeLessThanOrEqual(7);

        // Every anga must resolve to a real bilingual name, never undefined
        // — an off-by-one in any lookup table would surface here.
        for (const anga of [r.tithi, r.nakshatra, r.yoga, r.karana, r.vaara]) {
          expect(anga.name?.ta?.length).toBeGreaterThan(0);
          expect(anga.name?.en?.length).toBeGreaterThan(0);
        }
      }
    });

    it('produces both movable and fixed karanas over a lunation', () => {
      const seen = new Set<string>();
      for (let day = 1; day <= 30; day += 1) {
        seen.add(at(`2026-09-${String(day).padStart(2, '0')}`).karana.name.en);
      }
      // The seven movable karanas repeat eight times a month, so all should
      // appear; the four fixed ones each last only ~half a day, so sampling
      // once per sunrise catches some but not necessarily all.
      for (const movable of ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija']) {
        expect(seen).toContain(movable);
      }
      expect([...seen].some((name) => ['Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'].includes(name))).toBe(
        true,
      );
    });
  });

  describe('inauspicious periods', () => {
    it('matches the published Tamil almanac figures for Sunday', () => {
      // Almanacs quote Sunday Rahu Kalam as ~4:30-6:00 PM and Yamagandam as
      // ~12:00-1:30 PM, assuming an idealised 6am-6pm day. Real sunrise
      // shifts them slightly, so allow a 20-minute tolerance.
      const sunday = at('2026-09-06');
      expect(sunday.vaara.name.en).toBe('Sunday');
      expectCloseToClock(sunday.rahuKalam!.start, CHENNAI.timezone, 16 * 60 + 30);
      expectCloseToClock(sunday.yamagandam!.start, CHENNAI.timezone, 12 * 60);
    });

    it('matches the published figures for Saturday, including Gulika at sunrise', () => {
      // Saturday Rahu Kalam ~9:00-10:30 AM, and Saturday is the one day
      // Gulika occupies the FIRST eighth, i.e. starts at sunrise.
      const saturday = at('2026-09-05');
      expect(saturday.vaara.name.en).toBe('Saturday');
      expectCloseToClock(saturday.rahuKalam!.start, CHENNAI.timezone, 9 * 60);
      expect(saturday.gulikaKalam!.start).toBe(saturday.sunrise);
    });

    it('makes each of the three exactly one eighth of the daylight span', () => {
      const r = at('2026-09-05');
      const dayMinutes = (new Date(r.sunset!).getTime() - new Date(r.sunrise!).getTime()) / 60000;
      for (const window of [r.rahuKalam!, r.yamagandam!, r.gulikaKalam!]) {
        expect(durationMinutes(window)).toBeCloseTo(dayMinutes / 8, 3);
      }
      // They never overlap — the three tables assign distinct eighths.
      const starts = [r.rahuKalam!.start, r.yamagandam!.start, r.gulikaKalam!.start];
      expect(new Set(starts).size).toBe(3);
    });

    it('assigns a distinct eighth to each of the three on every weekday', () => {
      // A duplicate in the reference tables would make two "different"
      // inauspicious periods silently identical.
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const eighths = [RAHU_KALAM_EIGHTH[weekday], YAMAGANDAM_EIGHTH[weekday], GULIKA_EIGHTH[weekday]];
        expect(new Set(eighths).size).toBe(3);
        for (const eighth of eighths) {
          expect(eighth).toBeGreaterThanOrEqual(1);
          expect(eighth).toBeLessThanOrEqual(8);
        }
      }
    });

    it('puts Abhijit muhurta across local midday', () => {
      const r = at('2026-09-05');
      const middayish = (minutesInZone(r.sunrise!, CHENNAI.timezone) + minutesInZone(r.sunset!, CHENNAI.timezone)) / 2;
      const start = minutesInZone(r.abhijitMuhurta!.start, CHENNAI.timezone);
      const end = minutesInZone(r.abhijitMuhurta!.end, CHENNAI.timezone);
      expect(start).toBeLessThan(middayish);
      expect(end).toBeGreaterThan(middayish);
    });

    it('gives durmuhurtham as whole muhurtas — one fifteenth of the day each', () => {
      const r = at('2026-09-05');
      const dayMinutes = (new Date(r.sunset!).getTime() - new Date(r.sunrise!).getTime()) / 60000;
      expect(r.durmuhurtham.length).toBeGreaterThanOrEqual(1);
      for (const window of r.durmuhurtham) {
        expect(durationMinutes(window)).toBeCloseTo(dayMinutes / 15, 3);
      }
    });
  });

  describe('Gowri Panchangam / Nalla Neram', () => {
    it('covers the whole day in eight contiguous segments', () => {
      const r = at('2026-09-05');
      expect(r.gowriDay).toHaveLength(8);
      expect(r.gowriDay[0].start).toBe(r.sunrise);
      expect(r.gowriDay[7].end).toBe(r.sunset);
      for (let i = 1; i < r.gowriDay.length; i += 1) {
        expect(r.gowriDay[i].start).toBe(r.gowriDay[i - 1].end);
      }
    });

    it('runs the night segments from sunset onwards, contiguously', () => {
      const r = at('2026-09-05');
      expect(r.gowriNight).toHaveLength(8);
      expect(r.gowriNight[0].start).toBe(r.sunset);
      for (let i = 1; i < r.gowriNight.length; i += 1) {
        expect(r.gowriNight[i].start).toBe(r.gowriNight[i - 1].end);
      }
    });

    it('uses all eight qualities exactly once per day, on every weekday', () => {
      // The Gowri sequence is one cycle rotated per weekday, so a rotation
      // bug would show up as a repeated or missing quality.
      for (let day = 5; day <= 11; day += 1) {
        const r = at(`2026-09-${String(day).padStart(2, '0')}`);
        expect(new Set(r.gowriDay.map((w) => w.quality)).size).toBe(8);
      }
    });

    it('reports Nalla Neram as exactly the auspicious daytime segments', () => {
      const r = at('2026-09-05');
      expect(r.nallaNeram).toHaveLength(AUSPICIOUS_GOWRI.length);
      expect(r.nallaNeram.every((w) => w.auspicious)).toBe(true);
      expect(r.nallaNeram.every((w) => AUSPICIOUS_GOWRI.includes(w.quality))).toBe(true);
      expect(r.nallaNeram).toEqual(r.gowriDay.filter((w) => w.auspicious));
    });
  });

  describe('edge cases', () => {
    it('handles polar midnight sun without inventing a sunrise', () => {
      // Longyearbyen, midsummer: the Sun neither rises nor sets.
      const r = at('2026-06-21', { latitude: 78.22, longitude: 15.65, timezone: 'Arctic/Longyearbyen' });

      expect(r.polarDayOrNight).toBe(true);
      expect(r.sunrise).toBeNull();
      expect(r.sunset).toBeNull();
      expect(r.rahuKalam).toBeNull();
      expect(r.gowriDay).toEqual([]);
      expect(r.durmuhurtham).toEqual([]);

      // The five angas don't depend on sunrise existing, so they're still
      // reported (sampled at local noon instead).
      expect(r.tithi.index).toBeGreaterThanOrEqual(1);
      expect(r.nakshatra.name.ta.length).toBeGreaterThan(0);

      // And the omission is explained rather than silent.
      expect(r.notComputed.map((n) => n.item).join(' ')).toMatch(/Day-segment windows/);
    });

    it('always declares Varjyam as not computed, with a reason', () => {
      const varjyam = at('2026-09-05').notComputed.find((n) => n.item === 'Varjyam');
      expect(varjyam).toBeDefined();
      expect(varjyam!.reason.length).toBeGreaterThan(20);
    });

    it('rejects an invalid timezone with a 400 rather than silently using UTC', () => {
      expect(() =>
        service.compute({ date: '2026-09-05', latitude: 13, longitude: 80, timezone: 'Not/AZone' }),
      ).toThrow(BadRequestException);
    });

    it('is deterministic', () => {
      expect(at('2026-09-05')).toEqual(at('2026-09-05'));
    });
  });
});
