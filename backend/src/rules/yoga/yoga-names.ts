import { BilingualLabel } from '../../jathakam/names';

// Short classical-meaning tags for display, keyed by the YogaRule's
// `name` — kept to a phrase, not a paragraph. Full narrative interpretation
// is the AI layer's job (Phase 13); this is display metadata only, same
// role as jathakam/names.ts and house-analysis.ts's HOUSE_SIGNIFICATIONS.
export const YOGA_DESCRIPTIONS: Record<string, BilingualLabel> = {
  'Raja Yoga': {
    ta: 'அதிகாரம், செல்வாக்கு, உயர்வு ஆகியவற்றைக் குறிக்கும் கிரக இணைப்பு',
    en: 'Combination indicating authority, influence, and elevation in life',
  },
  'Dhana Yoga': {
    ta: 'செல்வம் மற்றும் நிதி வளத்தைக் குறிக்கும் இணைப்பு',
    en: 'Combination indicating wealth and financial prosperity',
  },
  'Gaja Kesari Yoga': {
    ta: 'புத்திக்கூர்மை, புகழ், நல்லெண்ணம் ஆகியவற்றைக் குறிக்கும் குரு-சந்திர இணைப்பு',
    en: 'Jupiter-Moon combination indicating intelligence, reputation, and goodwill',
  },
  'Budha Aditya Yoga': {
    ta: 'அறிவுக்கூர்மை மற்றும் பகுப்பாய்வு திறனைக் குறிக்கும் சூரிய-புத இணைப்பு',
    en: 'Sun-Mercury conjunction indicating sharp intellect and analytical skill',
  },
  'Neecha Bhanga Raja Yoga': {
    ta: 'ஒரு கிரகத்தின் நீச நிலை நீக்கப்பட்டு, சாதகமாக மாறும் நிலை',
    en: "Cancellation of a planet's debilitation, turning its weakness favorable",
  },
  'Dharma Karma Adhipati Yoga': {
    ta: 'தர்மமும் தொழிலும் இணையும் மிக சாதகமான ராஜ யோக வகை',
    en: 'A particularly auspicious Raja Yoga uniting dharma and career',
  },
  'Vipareeta Raja Yoga': {
    ta: 'கஷ்ட பாவங்களின் அதிபதிகள் ஒன்றிணைந்து, சாதகமாக மாறும் நிலை',
    en: 'Difficult-house lords combining in a way that turns favorable',
  },
  'Chandra Mangala Yoga': {
    ta: 'தொழில்முனைவு மற்றும் செல்வத்தைக் குறிக்கும் சந்திர-செவ்வாய் இணைப்பு',
    en: 'Moon-Mars conjunction indicating enterprise and wealth-building drive',
  },
};

export function yogaDescription(name: string): BilingualLabel | null {
  return YOGA_DESCRIPTIONS[name] ?? null;
}
