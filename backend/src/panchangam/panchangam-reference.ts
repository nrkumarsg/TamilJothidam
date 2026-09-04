import { BilingualLabel } from '../jathakam/names';

// Classical Panchangam reference data (Phase 21). Every table here is fixed
// tradition, not computation — the arithmetic lives in panchangam.service.ts.
//
// Where a table has genuine REGIONAL VARIATION (and several do), the
// convention followed is named explicitly rather than presented as the only
// one. This platform targets Tamil practice, so the South Indian /
// Tamil-almanac convention is used throughout.

// --- The five angas -------------------------------------------------------

// Tithi: a lunar day, 12° of Moon-minus-Sun elongation. Thirty per lunar
// month — fifteen waxing (Shukla/வளர்பிறை) then fifteen waning
// (Krishna/தேய்பிறை). The 15th of each half gets its own name: full moon
// (Pournami) and new moon (Amavasai).
export const TITHI_NAMES: BilingualLabel[] = [
  { ta: 'பிரதமை', en: 'Prathamai' },
  { ta: 'துவிதியை', en: 'Dwitiyai' },
  { ta: 'திருதியை', en: 'Trithiyai' },
  { ta: 'சதுர்த்தி', en: 'Chaturthi' },
  { ta: 'பஞ்சமி', en: 'Panchami' },
  { ta: 'சஷ்டி', en: 'Shashti' },
  { ta: 'சப்தமி', en: 'Saptami' },
  { ta: 'அஷ்டமி', en: 'Ashtami' },
  { ta: 'நவமி', en: 'Navami' },
  { ta: 'தசமி', en: 'Dasami' },
  { ta: 'ஏகாதசி', en: 'Ekadasi' },
  { ta: 'துவாதசி', en: 'Dwadasi' },
  { ta: 'திரயோதசி', en: 'Trayodasi' },
  { ta: 'சதுர்த்தசி', en: 'Chaturdasi' },
];

export const POURNAMI: BilingualLabel = { ta: 'பௌர்ணமி', en: 'Pournami (Full Moon)' };
export const AMAVASAI: BilingualLabel = { ta: 'அமாவாசை', en: 'Amavasai (New Moon)' };

export const PAKSHA_NAMES: Record<'SHUKLA' | 'KRISHNA', BilingualLabel> = {
  SHUKLA: { ta: 'வளர்பிறை', en: 'Shukla Paksha (waxing)' },
  KRISHNA: { ta: 'தேய்பிறை', en: 'Krishna Paksha (waning)' },
};

// Vaara: the weekday, indexed 0=Sunday to match JavaScript's getDay(). Note
// the Vedic day runs sunrise-to-sunrise, so the vaara before sunrise still
// belongs to the previous calendar day — handled in the service.
export const VAARA_NAMES: BilingualLabel[] = [
  { ta: 'ஞாயிற்றுக்கிழமை', en: 'Sunday' },
  { ta: 'திங்கட்கிழமை', en: 'Monday' },
  { ta: 'செவ்வாய்க்கிழமை', en: 'Tuesday' },
  { ta: 'புதன்கிழமை', en: 'Wednesday' },
  { ta: 'வியாழக்கிழமை', en: 'Thursday' },
  { ta: 'வெள்ளிக்கிழமை', en: 'Friday' },
  { ta: 'சனிக்கிழமை', en: 'Saturday' },
];

// Nithya Yoga: the 27 divisions of (Sun + Moon) longitude, each 13°20'.
// Distinct from the chart yogas of Phase 11 — same word, unrelated concept.
export const NITHYA_YOGA_NAMES: BilingualLabel[] = [
  { ta: 'விஷ்கம்பம்', en: 'Vishkambha' },
  { ta: 'ப்ரீதி', en: 'Priti' },
  { ta: 'ஆயுஷ்மான்', en: 'Ayushman' },
  { ta: 'சௌபாக்யம்', en: 'Saubhagya' },
  { ta: 'சோபனம்', en: 'Shobhana' },
  { ta: 'அதிகண்டம்', en: 'Atiganda' },
  { ta: 'சுகர்மா', en: 'Sukarma' },
  { ta: 'திருதி', en: 'Dhriti' },
  { ta: 'சூலம்', en: 'Shula' },
  { ta: 'கண்டம்', en: 'Ganda' },
  { ta: 'விருத்தி', en: 'Vriddhi' },
  { ta: 'துருவம்', en: 'Dhruva' },
  { ta: 'வியாகாதம்', en: 'Vyaghata' },
  { ta: 'ஹர்ஷணம்', en: 'Harshana' },
  { ta: 'வஜ்ரம்', en: 'Vajra' },
  { ta: 'சித்தி', en: 'Siddhi' },
  { ta: 'வ்யதீபாதம்', en: 'Vyatipata' },
  { ta: 'வரியான்', en: 'Variyan' },
  { ta: 'பரிகம்', en: 'Parigha' },
  { ta: 'சிவம்', en: 'Shiva' },
  { ta: 'சித்தம்', en: 'Siddha' },
  { ta: 'சாத்யம்', en: 'Sadhya' },
  { ta: 'சுபம்', en: 'Shubha' },
  { ta: 'சுக்லம்', en: 'Shukla' },
  { ta: 'பிரம்மம்', en: 'Brahma' },
  { ta: 'ஐந்திரம்', en: 'Indra' },
  { ta: 'வைதிருதி', en: 'Vaidhriti' },
];

// Karana: half a tithi (6° of elongation), so 60 per lunar month. Eleven
// names in all — seven "movable" (chara) that cycle eight times, and four
// "fixed" (sthira) that occur once each per month, bookending the cycle.
export const MOVABLE_KARANA_NAMES: BilingualLabel[] = [
  { ta: 'பவம்', en: 'Bava' },
  { ta: 'பாலவம்', en: 'Balava' },
  { ta: 'கௌலவம்', en: 'Kaulava' },
  { ta: 'தைதுலம்', en: 'Taitila' },
  { ta: 'கரஜம்', en: 'Gara' },
  { ta: 'வணிஜம்', en: 'Vanija' },
  { ta: 'விஷ்டி', en: 'Vishti (Bhadra)' },
];

export const KIMSTUGHNA: BilingualLabel = { ta: 'கிம்ஸ்துக்னம்', en: 'Kimstughna' };

// The three fixed karanas closing the lunar month, in order.
export const CLOSING_FIXED_KARANA_NAMES: BilingualLabel[] = [
  { ta: 'சகுனி', en: 'Shakuni' },
  { ta: 'சதுஷ்பாதம்', en: 'Chatushpada' },
  { ta: 'நாகவம்', en: 'Naga' },
];

// --- Inauspicious day segments -------------------------------------------

// Rahu Kalam, Yamagandam and Gulika (Kuligai) each occupy one eighth of the
// day, measured sunrise to sunset — so their real-world length varies with
// the season, and they are NOT the fixed 90-minute blocks often quoted.
//
// Values below are the 1-based eighth for each weekday (index 0 = Sunday),
// per the standard Tamil almanac tables.
export const RAHU_KALAM_EIGHTH: number[] = [8, 2, 7, 5, 6, 4, 3];
export const YAMAGANDAM_EIGHTH: number[] = [5, 4, 3, 2, 1, 7, 6];
export const GULIKA_EIGHTH: number[] = [7, 6, 5, 4, 3, 2, 1];

// Durmuhurtham: the day is split into fifteen muhurtas rather than eight,
// and specific ones are held inauspicious per weekday. REGIONAL VARIATION
// IS REAL here — the table below follows the common South Indian
// (Tamil/Telugu almanac) assignment. Wednesday and Sunday have a single
// durmuhurtham; the rest have two.
export const DURMUHURTHAM_MUHURTAS: number[][] = [
  [14], // Sunday
  [9, 12], // Monday
  [4, 11], // Tuesday
  [8], // Wednesday
  [6, 12], // Thursday
  [4, 9], // Friday
  [2, 6], // Saturday
];

export const MUHURTAS_PER_DAY = 15;

// --- Gowri Panchangam (Nalla Neram) --------------------------------------

// The Tamil "Nalla Neram" comes from the Gowri Panchangam, which labels each
// eighth of the day (and of the night) with one of eight qualities. Five are
// treated as auspicious and three as inauspicious.
export type GowriQuality =
  | 'AMIRTHAM'
  | 'SIDDHAM'
  | 'LAABHAM'
  | 'DHANAM'
  | 'SUGAM'
  | 'ROGAM'
  | 'SORAM'
  | 'VISHAM';

export const GOWRI_LABELS: Record<GowriQuality, BilingualLabel> = {
  AMIRTHAM: { ta: 'அமிர்தம்', en: 'Amirtham' },
  SIDDHAM: { ta: 'சித்தம்', en: 'Siddham' },
  LAABHAM: { ta: 'லாபம்', en: 'Laabham' },
  DHANAM: { ta: 'தனம்', en: 'Dhanam' },
  SUGAM: { ta: 'சுகம்', en: 'Sugam' },
  ROGAM: { ta: 'ரோகம்', en: 'Rogam' },
  SORAM: { ta: 'சோரம்', en: 'Soram' },
  VISHAM: { ta: 'விஷம்', en: 'Visham' },
};

// Which qualities count as "Nalla Neram" (good time).
export const AUSPICIOUS_GOWRI: GowriQuality[] = ['AMIRTHAM', 'SIDDHAM', 'LAABHAM', 'DHANAM', 'SUGAM'];

// The eight daytime Gowri segments per weekday (index 0 = Sunday). The
// sequence is the same cyclic order rotated by weekday, which is why each
// row is the previous one shifted — that rotation IS the rule, not a
// coincidence of the table.
const GOWRI_CYCLE: GowriQuality[] = [
  'VISHAM',
  'SORAM',
  'ROGAM',
  'LAABHAM',
  'DHANAM',
  'SUGAM',
  'AMIRTHAM',
  'SIDDHAM',
];

// Starting offset into GOWRI_CYCLE for each weekday's first daytime segment,
// following the common Tamil almanac arrangement.
const GOWRI_DAY_START_OFFSET: number[] = [6, 2, 5, 1, 4, 0, 3];

export function gowriDaySegments(weekdayIndex: number): GowriQuality[] {
  const start = GOWRI_DAY_START_OFFSET[weekdayIndex];
  return Array.from({ length: 8 }, (_, i) => GOWRI_CYCLE[(start + i) % 8]);
}

// Night follows the same cycle, continuing from where the day left off.
export function gowriNightSegments(weekdayIndex: number): GowriQuality[] {
  const start = (GOWRI_DAY_START_OFFSET[weekdayIndex] + 8) % 8;
  return Array.from({ length: 8 }, (_, i) => GOWRI_CYCLE[(start + i + 4) % 8]);
}
