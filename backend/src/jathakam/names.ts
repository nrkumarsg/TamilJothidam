// Human-readable Tamil/English labels for signs and nakshatras, used only
// to enrich API responses for display — the numeric signIndex/nakshatra
// fields from the calculation engine remain the source of truth everywhere
// else. This is a small, fixed lookup, NOT the general i18n/glossary system
// (that's Phase 14 — see backend/src/i18n/README.md); it exists here so
// Phase 5's "Rasi + Nakshatra + Lagna" output is actually readable.
export interface BilingualLabel {
  ta: string;
  en: string;
}

// Index 0 = மேஷம்/Aries .. 11 = மீனம்/Pisces, matching calculation engine signIndex.
export const SIGN_NAMES: BilingualLabel[] = [
  { ta: 'மேஷம்', en: 'Aries' },
  { ta: 'ரிஷபம்', en: 'Taurus' },
  { ta: 'மிதுனம்', en: 'Gemini' },
  { ta: 'கடகம்', en: 'Cancer' },
  { ta: 'சிம்மம்', en: 'Leo' },
  { ta: 'கன்னி', en: 'Virgo' },
  { ta: 'துலாம்', en: 'Libra' },
  { ta: 'விருச்சிகம்', en: 'Scorpio' },
  { ta: 'தனுசு', en: 'Sagittarius' },
  { ta: 'மகரம்', en: 'Capricorn' },
  { ta: 'கும்பம்', en: 'Aquarius' },
  { ta: 'மீனம்', en: 'Pisces' },
];

// Index 0 = நட்சத்திரம் 1 (அஸ்வினி) .. 26 = நட்சத்திரம் 27 (ரேவதி); access as
// NAKSHATRA_NAMES[nakshatra - 1] since the engine's `nakshatra` field is 1-27.
export const NAKSHATRA_NAMES: BilingualLabel[] = [
  { ta: 'அஸ்வினி', en: 'Ashwini' },
  { ta: 'பரணி', en: 'Bharani' },
  { ta: 'கார்த்திகை', en: 'Krittika' },
  { ta: 'ரோகிணி', en: 'Rohini' },
  { ta: 'மிருகசீரிடம்', en: 'Mrigashirsha' },
  { ta: 'திருவாதிரை', en: 'Ardra' },
  { ta: 'புனர்பூசம்', en: 'Punarvasu' },
  { ta: 'பூசம்', en: 'Pushya' },
  { ta: 'ஆயில்யம்', en: 'Ashlesha' },
  { ta: 'மகம்', en: 'Magha' },
  { ta: 'பூரம்', en: 'Purva Phalguni' },
  { ta: 'உத்திரம்', en: 'Uttara Phalguni' },
  { ta: 'அஸ்தம்', en: 'Hasta' },
  { ta: 'சித்திரை', en: 'Chitra' },
  { ta: 'சுவாதி', en: 'Swati' },
  { ta: 'விசாகம்', en: 'Vishakha' },
  { ta: 'அனுஷம்', en: 'Anuradha' },
  { ta: 'கேட்டை', en: 'Jyeshtha' },
  { ta: 'மூலம்', en: 'Mula' },
  { ta: 'பூராடம்', en: 'Purva Ashadha' },
  { ta: 'உத்திராடம்', en: 'Uttara Ashadha' },
  { ta: 'திருவோணம்', en: 'Shravana' },
  { ta: 'அவிட்டம்', en: 'Dhanishta' },
  { ta: 'சதயம்', en: 'Shatabhisha' },
  { ta: 'பூரட்டாதி', en: 'Purva Bhadrapada' },
  { ta: 'உத்திரட்டாதி', en: 'Uttara Bhadrapada' },
  { ta: 'ரேவதி', en: 'Revati' },
];

export function signName(signIndex: number): BilingualLabel {
  return SIGN_NAMES[signIndex];
}

export function nakshatraName(nakshatra: number): BilingualLabel {
  return NAKSHATRA_NAMES[nakshatra - 1];
}
