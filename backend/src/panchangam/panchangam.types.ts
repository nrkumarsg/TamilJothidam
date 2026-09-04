import { BilingualLabel } from '../jathakam/names';
import { GowriQuality } from './panchangam-reference';

export interface PanchangamQuery {
  /** ISO date, e.g. "2026-09-05" — the local calendar date at the place. */
  date: string;
  latitude: number;
  longitude: number;
  /** IANA zone, e.g. "Asia/Kolkata". */
  timezone: string;
}

export interface TimeWindow {
  /** ISO instants, so the caller can render them in any zone. */
  start: string;
  end: string;
}

export interface NamedWindow extends TimeWindow {
  name: BilingualLabel;
}

export interface GowriWindow extends TimeWindow {
  quality: GowriQuality;
  name: BilingualLabel;
  auspicious: boolean;
}

export interface AngaValue {
  /** 1-based index within its own cycle (tithi 1-30, yoga 1-27, etc.). */
  index: number;
  name: BilingualLabel;
}

export interface TithiValue extends AngaValue {
  paksha: 'SHUKLA' | 'KRISHNA';
  pakshaName: BilingualLabel;
  /** How far through this tithi the moment of sunrise falls, 0-1. */
  elapsedFraction: number;
}

export interface PanchangamResult {
  date: string;
  location: { latitude: number; longitude: number; timezone: string };

  /**
   * Everything below is computed AT SUNRISE, which is when a Vedic day
   * begins — not at midnight, and not "now". A panchangam that reported the
   * tithi at midnight would disagree with every printed almanac.
   */
  sunrise: string | null;
  sunset: string | null;
  /** True at polar latitudes on days with no sunrise or no sunset. */
  polarDayOrNight: boolean;

  tithi: TithiValue;
  vaara: AngaValue;
  nakshatra: AngaValue;
  yoga: AngaValue;
  karana: AngaValue;

  /** Inauspicious eighths of the day, each sunrise-to-sunset relative. */
  rahuKalam: TimeWindow | null;
  yamagandam: TimeWindow | null;
  gulikaKalam: TimeWindow | null;

  /** Inauspicious muhurtas (1/15th of the day each). */
  durmuhurtham: TimeWindow[];

  /** The auspicious midday muhurta. */
  abhijitMuhurta: TimeWindow | null;

  /** Full Gowri Panchangam for day and night, in order. */
  gowriDay: GowriWindow[];
  gowriNight: GowriWindow[];
  /** Just the auspicious Gowri windows during daylight — "Nalla Neram". */
  nallaNeram: GowriWindow[];

  /** Anything this result deliberately does not compute. */
  notComputed: { item: string; reason: string }[];
}
