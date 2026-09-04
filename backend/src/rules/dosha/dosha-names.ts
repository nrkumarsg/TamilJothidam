import { BilingualLabel } from '../../jathakam/names';

// Display descriptions for detected doshas — spec §22 is explicit: never
// use fear-based language ("your life will be destroyed" is banned), always
// frame as traditional interpretation, and always show the rule that
// triggered it (see ruleTriggered on each DoshaResult) rather than a bare
// verdict. Every description here follows the required framing pattern:
// "இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில் இப்படிப் பொருள் கொள்ளப்படுகிறது..."
// ("this configuration is traditionally interpreted as...").
export const DOSHA_DESCRIPTIONS: Record<string, BilingualLabel> = {
  'Sevvai Dosham (Manglik)': {
    ta: 'இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில் திருமண பொருத்தத்தில் கவனம் தேவைப்படும் ஒரு அமைப்பாகப் பொருள் கொள்ளப்படுகிறது. இது ஜோடி பொருத்தத்தின் ஒரு காரணியாக மட்டுமே பார்க்கப்பட வேண்டும்.',
    en: 'Traditionally interpreted as a placement worth factoring into marriage-compatibility matching. It is one consideration among several, not a standalone verdict.',
  },
  'Kala Sarpa Dosha': {
    ta: 'இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில் வாழ்க்கையில் தாமதங்கள் மற்றும் தடைகள் ஏற்படக்கூடும் என்று பொருள் கொள்ளப்படுகிறது, ஆனால் பல ஜாதகங்களில் இது காணப்படும் பொதுவான அமைப்பே.',
    en: 'Traditionally interpreted as indicating delays or obstacles at points in life, though this is a fairly common configuration across many charts.',
  },
  'Pitru Dosha': {
    ta: 'இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில் முன்னோர்/தந்தை தொடர்பான காரணிகளுக்கு கவனம் தேவை என்று பொருள் கொள்ளப்படுகிறது.',
    en: 'Traditionally interpreted as calling for attention to ancestral/paternal-lineage matters.',
  },
  'Grahana Dosha': {
    ta: 'இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில் ஒரு "கிரகணம்" போன்ற அமைப்பாகப் பொருள் கொள்ளப்படுகிறது, மனத்தெளிவு தொடர்பான காரணிகளுக்கு கவனம் தேவை என்று விளக்கப்படுகிறது.',
    en: 'Traditionally interpreted as an "eclipse-like" configuration, often read as calling for attention to clarity of mind and judgement.',
  },
};

export function doshaDescription(name: string): BilingualLabel | null {
  return DOSHA_DESCRIPTIONS[name] ?? null;
}
