import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { EphemerisService } from '../calculation/ephemeris.service';
import { normalizeDegrees } from '../calculation/derivation';
import { nakshatraName } from '../jathakam/names';
import { jdToDate } from '../dasha/dasha.util';
import {
  AMAVASAI,
  AUSPICIOUS_GOWRI,
  CLOSING_FIXED_KARANA_NAMES,
  DURMUHURTHAM_MUHURTAS,
  GOWRI_LABELS,
  GULIKA_EIGHTH,
  KIMSTUGHNA,
  MOVABLE_KARANA_NAMES,
  MUHURTAS_PER_DAY,
  NITHYA_YOGA_NAMES,
  PAKSHA_NAMES,
  POURNAMI,
  RAHU_KALAM_EIGHTH,
  TITHI_NAMES,
  VAARA_NAMES,
  YAMAGANDAM_EIGHTH,
  gowriDaySegments,
  gowriNightSegments,
} from './panchangam-reference';
import { GowriWindow, PanchangamQuery, PanchangamResult, TimeWindow } from './panchangam.types';

const TITHI_SPAN_DEGREES = 12; // 360 / 30
const KARANA_SPAN_DEGREES = 6; // half a tithi
const YOGA_SPAN_DEGREES = 360 / 27;
const NAKSHATRA_SPAN_DEGREES = 360 / 27;

// Panchangam engine (Phase 21) — "pancha anga", the five limbs of the day:
// tithi, vaara, nakshatra, yoga, karana. Entirely independent of the
// birth-chart pipeline: it takes a date and a place, never a birth profile.
//
// The single most important design point: EVERY value here is computed at
// SUNRISE, because the Vedic day begins at sunrise rather than midnight. A
// panchangam that sampled positions at 00:00 local time would disagree with
// every printed almanac, most visibly on the tithi and the weekday.
@Injectable()
export class PanchangamService {
  constructor(private readonly ephemeris: EphemerisService) {}

  compute(query: PanchangamQuery): PanchangamResult {
    const { date, latitude, longitude, timezone } = query;

    const localMidnight = DateTime.fromISO(date, { zone: timezone }).startOf('day');
    if (!localMidnight.isValid) {
      throw new BadRequestException(
        `Invalid date "${date}" for timezone "${timezone}": ${localMidnight.invalidReason}`,
      );
    }

    // Search for sunrise starting a little before local midnight, so a place
    // whose sunrise falls very early still resolves to THIS day's event.
    const searchStartJd = this.ephemeris.julianDayUt(
      localMidnight.minus({ hours: 2 }).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      timezone,
    );
    const { sunriseJd, sunsetJd } = this.ephemeris.sunriseSunset(searchStartJd, latitude, longitude);

    const polarDayOrNight = sunriseJd === null || sunsetJd === null;
    const notComputed: PanchangamResult['notComputed'] = [
      {
        item: 'Varjyam',
        reason:
          'Needs per-nakshatra vishaghati fractions plus the exact nakshatra start/end instants. ' +
          'The published fraction tables vary between almanac traditions, so rather than ship ' +
          'plausible-looking numbers this is left uncomputed.',
      },
    ];
    if (polarDayOrNight) {
      notComputed.push({
        item: 'Day-segment windows (Rahu Kalam, Yamagandam, Gulika, Gowri, muhurtas)',
        reason:
          'The Sun does not both rise and set on this date at this latitude, so there is no ' +
          'sunrise-to-sunset interval to divide.',
      });
    }

    // The angas are sampled at sunrise; with no sunrise (polar day/night)
    // fall back to local noon so the five limbs still have a defined value.
    const referenceJd =
      sunriseJd ??
      this.ephemeris.julianDayUt(localMidnight.plus({ hours: 12 }).toFormat("yyyy-MM-dd'T'HH:mm:ss"), timezone);

    const sunLongitude = this.ephemeris.siderealLongitudeForGraha('SUN', referenceJd).longitude;
    const moonLongitude = this.ephemeris.siderealLongitudeForGraha('MOON', referenceJd).longitude;

    // Elongation: how far the Moon has pulled ahead of the Sun. Drives
    // tithi, karana and paksha alike.
    const elongation = normalizeDegrees(moonLongitude - sunLongitude);

    const tithi = this.computeTithi(elongation);
    const karana = this.computeKarana(elongation);
    const yoga = this.computeYoga(sunLongitude, moonLongitude);
    const nakshatraIndex = Math.floor(moonLongitude / NAKSHATRA_SPAN_DEGREES) + 1;

    // The vaara belongs to the day that STARTED at this sunrise, so it is
    // read from the sunrise instant in local time, not from the requested
    // calendar date.
    const sunriseLocal = sunriseJd !== null ? DateTime.fromJSDate(jdToDate(sunriseJd)).setZone(timezone) : localMidnight;
    const weekdayIndex = sunriseLocal.weekday % 7; // luxon: 1=Mon..7=Sun -> 0=Sun..6=Sat

    const dayWindows = this.buildDayWindows(sunriseJd, sunsetJd, weekdayIndex);

    return {
      date,
      location: { latitude, longitude, timezone },
      sunrise: sunriseJd !== null ? jdToDate(sunriseJd).toISOString() : null,
      sunset: sunsetJd !== null ? jdToDate(sunsetJd).toISOString() : null,
      polarDayOrNight,
      tithi,
      vaara: { index: weekdayIndex + 1, name: VAARA_NAMES[weekdayIndex] },
      nakshatra: { index: nakshatraIndex, name: nakshatraName(nakshatraIndex) },
      yoga,
      karana,
      ...dayWindows,
      notComputed,
    };
  }

  // Tithi 1-30: fifteen waxing then fifteen waning, each 12° of elongation.
  private computeTithi(elongation: number): PanchangamResult['tithi'] {
    const raw = elongation / TITHI_SPAN_DEGREES;
    const index = Math.floor(raw) + 1; // 1-30
    const withinPaksha = ((index - 1) % 15) + 1; // 1-15
    const paksha = index <= 15 ? 'SHUKLA' : 'KRISHNA';

    // The 15th of each half is the full moon / new moon and carries its own
    // name rather than "Panchadasi".
    const name =
      withinPaksha === 15 ? (paksha === 'SHUKLA' ? POURNAMI : AMAVASAI) : TITHI_NAMES[withinPaksha - 1];

    return {
      index,
      name,
      paksha,
      pakshaName: PAKSHA_NAMES[paksha],
      elapsedFraction: raw - Math.floor(raw),
    };
  }

  // Karana: 60 half-tithis per lunar month. Kimstughna opens the month, the
  // seven movable karanas then cycle eight times, and Shakuni/Chatushpada/
  // Naga close it.
  private computeKarana(elongation: number): PanchangamResult['karana'] {
    const slot = Math.floor(elongation / KARANA_SPAN_DEGREES); // 0-59

    if (slot === 0) {
      return { index: 1, name: KIMSTUGHNA };
    }
    if (slot >= 57) {
      return { index: slot + 1, name: CLOSING_FIXED_KARANA_NAMES[slot - 57] };
    }
    return { index: slot + 1, name: MOVABLE_KARANA_NAMES[(slot - 1) % 7] };
  }

  // Nithya yoga: 27 divisions of the SUM of the two luminaries' longitudes.
  private computeYoga(sunLongitude: number, moonLongitude: number): PanchangamResult['yoga'] {
    const combined = normalizeDegrees(sunLongitude + moonLongitude);
    const index = Math.floor(combined / YOGA_SPAN_DEGREES) + 1; // 1-27
    return { index, name: NITHYA_YOGA_NAMES[index - 1] };
  }

  private buildDayWindows(
    sunriseJd: number | null,
    sunsetJd: number | null,
    weekdayIndex: number,
  ): Pick<
    PanchangamResult,
    | 'rahuKalam'
    | 'yamagandam'
    | 'gulikaKalam'
    | 'durmuhurtham'
    | 'abhijitMuhurta'
    | 'gowriDay'
    | 'gowriNight'
    | 'nallaNeram'
  > {
    if (sunriseJd === null || sunsetJd === null) {
      return {
        rahuKalam: null,
        yamagandam: null,
        gulikaKalam: null,
        durmuhurtham: [],
        abhijitMuhurta: null,
        gowriDay: [],
        gowriNight: [],
        nallaNeram: [],
      };
    }

    // Rahu Kalam and friends are eighths of the DAYLIGHT span, so they are
    // longer in summer and shorter in winter — not the fixed 90-minute
    // blocks often quoted.
    const dayLengthJd = sunsetJd - sunriseJd;
    const eighth = dayLengthJd / 8;
    const nthEighth = (n: number): TimeWindow => this.window(sunriseJd + (n - 1) * eighth, sunriseJd + n * eighth);

    // Muhurtas are fifteenths of the same daylight span.
    const muhurta = dayLengthJd / MUHURTAS_PER_DAY;
    const nthMuhurta = (n: number): TimeWindow =>
      this.window(sunriseJd + (n - 1) * muhurta, sunriseJd + n * muhurta);

    // Night runs sunset to the NEXT sunrise; approximated as the complement
    // of the daylight span within 24h, which is within a minute or two of
    // the true next sunrise and keeps this a single-day calculation.
    const nightLengthJd = 1 - dayLengthJd;
    const nightEighth = nightLengthJd / 8;

    const dayQualities = gowriDaySegments(weekdayIndex);
    const nightQualities = gowriNightSegments(weekdayIndex);

    const gowriDay: GowriWindow[] = dayQualities.map((quality, i) => ({
      ...this.window(sunriseJd + i * eighth, sunriseJd + (i + 1) * eighth),
      quality,
      name: GOWRI_LABELS[quality],
      auspicious: AUSPICIOUS_GOWRI.includes(quality),
    }));

    const gowriNight: GowriWindow[] = nightQualities.map((quality, i) => ({
      ...this.window(sunsetJd + i * nightEighth, sunsetJd + (i + 1) * nightEighth),
      quality,
      name: GOWRI_LABELS[quality],
      auspicious: AUSPICIOUS_GOWRI.includes(quality),
    }));

    return {
      rahuKalam: nthEighth(RAHU_KALAM_EIGHTH[weekdayIndex]),
      yamagandam: nthEighth(YAMAGANDAM_EIGHTH[weekdayIndex]),
      gulikaKalam: nthEighth(GULIKA_EIGHTH[weekdayIndex]),
      durmuhurtham: DURMUHURTHAM_MUHURTAS[weekdayIndex].map(nthMuhurta),
      // Abhijit is the 8th of the fifteen muhurtas — the one straddling
      // local apparent noon, and the least ambiguous auspicious window in
      // the tradition.
      abhijitMuhurta: nthMuhurta(8),
      gowriDay,
      gowriNight,
      nallaNeram: gowriDay.filter((w) => w.auspicious),
    };
  }

  private window(startJd: number, endJd: number): TimeWindow {
    return { start: jdToDate(startJd).toISOString(), end: jdToDate(endJd).toISOString() };
  }
}
