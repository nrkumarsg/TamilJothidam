// Short display abbreviations for grahas inside chart cells — presentation
// only, scoped to the chart renderer (like backend/src/jathakam/names.ts,
// this is not the Phase 14 i18n system).
export const GRAHA_ABBREV: Record<string, { ta: string; en: string }> = {
  SUN: { ta: 'சூரி', en: 'Su' },
  MOON: { ta: 'சந்', en: 'Mo' },
  MARS: { ta: 'செவ்', en: 'Ma' },
  MERCURY: { ta: 'புத', en: 'Me' },
  JUPITER: { ta: 'குரு', en: 'Ju' },
  VENUS: { ta: 'சுக்', en: 'Ve' },
  SATURN: { ta: 'சனி', en: 'Sa' },
  RAHU: { ta: 'ராகு', en: 'Ra' },
  KETU: { ta: 'கேது', en: 'Ke' },
};
