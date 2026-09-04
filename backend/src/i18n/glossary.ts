import { Graha } from '@prisma/client';
import { BilingualLabel } from '../jathakam/names';

// Locales this system understands. Only 'ta' (default, spec §26/§27) and
// 'en' have translations. Spec §27 names Sinhala/Malayalam/Hindi/Telugu/
// Kannada/Malay as future locales — the type is deliberately not widened to
// include them until real translations exist; adding one later is a matter
// of extending this union and every Record below, not a restructure.
export type Locale = 'ta' | 'en';
export const DEFAULT_LOCALE: Locale = 'ta';
export const SUPPORTED_LOCALES: readonly Locale[] = ['ta', 'en'];

// Full graha names (as opposed to jathakam/names.ts's sign/nakshatra names,
// or frontend/src/components/chart/graha-labels.ts's short chart-cell
// abbreviations like "சூரி"/"Su") — the form used in narrative prose and
// section headings. LAGNA is included since it shares the Graha enum.
export const GRAHA_NAMES: Record<Graha, BilingualLabel> = {
  SUN: { ta: 'சூரியன்', en: 'Sun' },
  MOON: { ta: 'சந்திரன்', en: 'Moon' },
  MARS: { ta: 'செவ்வாய்', en: 'Mars' },
  MERCURY: { ta: 'புதன்', en: 'Mercury' },
  JUPITER: { ta: 'குரு', en: 'Jupiter' },
  VENUS: { ta: 'சுக்கிரன்', en: 'Venus' },
  SATURN: { ta: 'சனி', en: 'Saturn' },
  RAHU: { ta: 'ராகு', en: 'Rahu' },
  KETU: { ta: 'கேது', en: 'Ketu' },
  LAGNA: { ta: 'லக்னம்', en: 'Lagna' },
};

export function grahaName(graha: Graha): BilingualLabel {
  return GRAHA_NAMES[graha];
}

// The core terminology spec §26 requires the AI layer's Tamil output to
// use — "professional Tamil, not literal machine translation". Hand-
// maintained here so it stays correct regardless of what the AI generates;
// backend/prompts/system.md also names several of these directly in its
// own prose since prompts are static, human-authored markdown by design,
// not templated off this table.
export type CoreTermKey =
  | 'jathakam'
  | 'lagna'
  | 'rasi'
  | 'nakshatra'
  | 'pada'
  | 'bhava'
  | 'bhavaAdhipati'
  | 'dasha'
  | 'bukti'
  | 'gochara'
  | 'yogam'
  | 'dosham'
  | 'pariharam'
  | 'selvam'
  | 'thozhil'
  | 'thirumanam'
  | 'kudumbam'
  | 'udalnalam'
  | 'kalvi'
  | 'sothu';

export const CORE_TERMS: Record<CoreTermKey, BilingualLabel> = {
  jathakam: { ta: 'ஜாதகம்', en: 'Jathakam (birth chart)' },
  lagna: { ta: 'லக்னம்', en: 'Lagna (ascendant)' },
  rasi: { ta: 'ராசி', en: 'Rasi (moon sign)' },
  nakshatra: { ta: 'நட்சத்திரம்', en: 'Nakshatra' },
  pada: { ta: 'பாதம்', en: 'Pada' },
  bhava: { ta: 'பாவம்', en: 'Bhava (house)' },
  bhavaAdhipati: { ta: 'பாவாதிபதி', en: 'Bhava lord' },
  dasha: { ta: 'தசை', en: 'Dasha' },
  bukti: { ta: 'புத்தி', en: 'Bukti (antardasha)' },
  gochara: { ta: 'கோச்சாரம்', en: 'Gochara (transit)' },
  yogam: { ta: 'யோகம்', en: 'Yoga' },
  dosham: { ta: 'தோஷம்', en: 'Dosha' },
  pariharam: { ta: 'பரிகாரம்', en: 'Pariharam (remedy)' },
  selvam: { ta: 'செல்வம்', en: 'Wealth' },
  thozhil: { ta: 'தொழில்', en: 'Career' },
  thirumanam: { ta: 'திருமணம்', en: 'Marriage' },
  kudumbam: { ta: 'குடும்பம்', en: 'Family' },
  udalnalam: { ta: 'உடல்நலம்', en: 'Health' },
  kalvi: { ta: 'கல்வி', en: 'Education' },
  sothu: { ta: 'சொத்து', en: 'Property' },
};

export function coreTerm(key: CoreTermKey): BilingualLabel {
  return CORE_TERMS[key];
}

// The fixed 34-section report structure (spec §28) — the table of contents
// every generated Jathakam report follows, in the exact order and wording
// spec §28 specifies. This module only owns the headings; Phase 15 (full
// report generator) assembles the actual per-section content, and 7 of
// these sections already have AI-generated content today via
// backend/src/ai/prediction.types.ts's PREDICTION_SECTIONS (slugs noted
// below where they correspond 1:1 — basic_reading=summary, health=health,
// wealth=wealth, career=career, marriage=marriage; karma and future are
// close-but-not-exact matches to spirituality/future_life and are kept
// separate rather than force-aligned).
export interface ReportSection {
  id: number;
  slug: string;
  ta: string;
  en: string;
}

export const REPORT_SECTIONS: ReportSection[] = [
  { id: 1, slug: 'summary', ta: 'ஜாதகத்தின் சுருக்கம்', en: 'Chart Summary' },
  { id: 2, slug: 'lagna_rasi', ta: 'லக்னம் மற்றும் ராசி', en: 'Lagna and Rasi' },
  { id: 3, slug: 'nakshatra_pada', ta: 'நட்சத்திரம் மற்றும் பாதம்', en: 'Nakshatra and Pada' },
  { id: 4, slug: 'planetary_positions', ta: 'கிரக நிலைகள்', en: 'Planetary Positions' },
  { id: 5, slug: 'rasi_chart', ta: 'ராசி கட்டம்', en: 'Rasi Chart' },
  { id: 6, slug: 'navamsa_chart', ta: 'நவாம்ச கட்டம்', en: 'Navamsa Chart' },
  { id: 7, slug: 'house_analysis', ta: '12 பாவங்களின் விளக்கம்', en: 'Analysis of the 12 Houses' },
  { id: 8, slug: 'graha_phalan', ta: 'கிரக பலன்கள்', en: 'Planetary Results' },
  { id: 9, slug: 'yogas', ta: 'முக்கிய யோகங்கள்', en: 'Notable Yogas' },
  { id: 10, slug: 'doshas', ta: 'தோஷங்கள்', en: 'Doshas' },
  { id: 11, slug: 'vimshottari_dasha', ta: 'விம்சோத்தரி தசை', en: 'Vimshottari Dasha' },
  { id: 12, slug: 'current_dasha', ta: 'தற்போதைய தசை', en: 'Current Dasha' },
  { id: 13, slug: 'transit_results', ta: 'கோச்சார பலன்கள்', en: 'Transit Results' },
  { id: 14, slug: 'past_life', ta: 'கடந்த கால வாழ்க்கை விளக்கம்', en: 'Past Life Overview' },
  { id: 15, slug: 'present_life', ta: 'தற்போதைய வாழ்க்கை நிலை', en: 'Present Life Stage' },
  { id: 16, slug: 'future_life', ta: 'எதிர்கால வாழ்க்கை', en: 'Future Life' },
  { id: 17, slug: 'health', ta: 'உடல்நலம்', en: 'Health' },
  { id: 18, slug: 'wealth', ta: 'செல்வம்', en: 'Wealth' },
  { id: 19, slug: 'career', ta: 'தொழில்', en: 'Career' },
  { id: 20, slug: 'business', ta: 'வியாபாரம்', en: 'Business' },
  { id: 21, slug: 'marriage', ta: 'திருமணம்', en: 'Marriage' },
  { id: 22, slug: 'family', ta: 'குடும்பம்', en: 'Family' },
  { id: 23, slug: 'children', ta: 'குழந்தைகள்', en: 'Children' },
  { id: 24, slug: 'education', ta: 'கல்வி', en: 'Education' },
  { id: 25, slug: 'foreign_travel', ta: 'வெளிநாடு', en: 'Foreign Travel' },
  { id: 26, slug: 'property', ta: 'சொத்து', en: 'Property' },
  { id: 27, slug: 'spirituality', ta: 'ஆன்மிகம்', en: 'Spirituality' },
  { id: 28, slug: 'favorable_periods', ta: 'சாதகமான காலங்கள்', en: 'Favorable Periods' },
  { id: 29, slug: 'favorable_days', ta: 'சாதகமான நாட்கள்', en: 'Favorable Days' },
  { id: 30, slug: 'favorable_colors', ta: 'சாதகமான நிறங்கள்', en: 'Favorable Colors' },
  { id: 31, slug: 'favorable_numbers', ta: 'சாதகமான எண்கள்', en: 'Favorable Numbers' },
  { id: 32, slug: 'remedies', ta: 'பரிகாரங்கள்', en: 'Remedies' },
  { id: 33, slug: 'life_timeline', ta: 'முக்கியமான வாழ்க்கை காலவரிசை', en: 'Key Life Timeline' },
  { id: 34, slug: 'final_summary', ta: 'இறுதி சுருக்கம்', en: 'Final Summary' },
];

export function reportSectionById(id: number): ReportSection | undefined {
  return REPORT_SECTIONS.find((s) => s.id === id);
}

export function reportSectionBySlug(slug: string): ReportSection | undefined {
  return REPORT_SECTIONS.find((s) => s.slug === slug);
}
