import { Graha } from '@prisma/client';
import { BilingualLabel } from './names';

// House (bhava) analysis — spec §7. Everything here is deterministic
// classical reference data or arithmetic derived from already-computed
// chart data (Phase 4/5); it stops exactly where interpretation prose
// begins ("வாழ்க்கையில் அதன் தாக்கம்", spec §7 item 8) — that is the AI
// layer's job (Phase 13), reading this structured data, never inventing it.

// Item 1: "அந்த பாவம் எதை குறிக்கிறது?" — fixed classical signification per
// house NUMBER (not sign), BPHS ch. 3. Kept to short keyword tags, not full
// sentences — the narrative belongs to the AI interpretation layer.
export const HOUSE_SIGNIFICATIONS: BilingualLabel[] = [
  { ta: 'உடல், ஆளுமை, தன்மை', en: 'Self, body, personality' }, // 1
  { ta: 'செல்வம், குடும்பம், பேச்சு', en: 'Wealth, family, speech' }, // 2
  { ta: 'தைரியம், உடன்பிறப்புகள், முயற்சி', en: 'Courage, siblings, effort' }, // 3
  { ta: 'தாய், சொத்து, மனநிறைவு', en: 'Mother, property, contentment' }, // 4
  { ta: 'குழந்தைகள், கல்வி, புத்திக்கூர்மை', en: 'Children, education, intellect' }, // 5
  { ta: 'நோய், கடன், எதிரிகள்', en: 'Health issues, debt, adversaries' }, // 6
  { ta: 'திருமணம், கூட்டாண்மை', en: 'Marriage, partnerships' }, // 7
  { ta: 'ஆயுள், மறைவான விஷயங்கள், மாற்றங்கள்', en: 'Longevity, hidden matters, transformation' }, // 8
  { ta: 'அதிர்ஷ்டம், தந்தை, தர்மம்', en: 'Fortune, father, dharma' }, // 9
  { ta: 'தொழில், சமூக அந்தஸ்து', en: 'Career, social standing' }, // 10
  { ta: 'வருமானம், லாபம், நண்பர்கள்', en: 'Income, gains, friendships' }, // 11
  { ta: 'செலவு, இழப்பு, மோட்சம்', en: 'Expenditure, loss, liberation' }, // 12
];

// Item 5: graha drishti (aspects). Every graha casts the universal 7th-house
// aspect (BPHS ch. 5); Mars/Jupiter/Saturn additionally cast the special
// aspects BPHS assigns them. Rahu/Ketu are given only the universal 7th
// aspect here — classical texts substantially disagree on nodal special
// aspects (some equate them to Jupiter, others to Saturn), so — consistent
// with how dignity handles the nodes (reference-data.ts) — this only
// asserts what is uncontested rather than picking a side.
const ASPECT_OFFSETS_FROM_HOUSE: Partial<Record<Graha, number[]>> = {
  SUN: [7],
  MOON: [7],
  MARS: [4, 7, 8],
  MERCURY: [7],
  JUPITER: [5, 7, 9],
  VENUS: [7],
  SATURN: [3, 7, 10],
  RAHU: [7],
  KETU: [7],
};

// Houses aspected by a graha currently placed in `fromHouse` (1-12).
export function aspectedHouses(graha: Graha, fromHouse: number): number[] {
  const offsets = ASPECT_OFFSETS_FROM_HOUSE[graha];
  if (!offsets) return [];
  return offsets.map((n) => ((fromHouse - 1 + (n - 1)) % 12) + 1);
}

// Item 6: benefic/malefic (subha/asubha) classification. Basic naisargika
// (natural) classification only — Sun/Mars/Saturn/Rahu/Ketu are malefic in
// essentially every tradition; Moon/Mercury/Jupiter/Venus are treated here
// as benefic under the common simplified convention used as a default in
// most software. Some texts apply conditional refinements (Moon's paksha —
// waxing/waning; Mercury's benefic/malefic nature depending on its
// association) that are NOT implemented here — documented, not silently
// assumed away.
const NATURAL_MALEFICS = new Set<Graha>(['SUN', 'MARS', 'SATURN', 'RAHU', 'KETU']);

export function isNaturalMalefic(graha: Graha): boolean {
  return NATURAL_MALEFICS.has(graha);
}

export function isNaturalBenefic(graha: Graha): boolean {
  return graha !== 'LAGNA' && !NATURAL_MALEFICS.has(graha);
}
