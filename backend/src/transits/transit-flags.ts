// Named Saturn transit conditions (spec §9), all measured as the house
// transiting Saturn currently occupies counted from the NATAL MOON's sign
// (not Lagna) — the traditional reference point for Saturn transit
// analysis in Vedic astrology.

export type SadeSatiPhase = 'RISING' | 'PEAK' | 'SETTING';

// Sade Sati ("சாடே சாத்தி" / ஏழரை சனி): the ~7.5-year period when transiting
// Saturn occupies the 12th, 1st, or 2nd house from natal Moon. This
// three-house span (and its three-phase naming) is the standard,
// uncontested classical definition.
export function sadeSatiPhase(saturnHouseFromMoon: number): SadeSatiPhase | null {
  if (saturnHouseFromMoon === 12) return 'RISING'; // முதல் அடி
  if (saturnHouseFromMoon === 1) return 'PEAK'; // உச்ச கட்டம்
  if (saturnHouseFromMoon === 2) return 'SETTING'; // இறுதி அடி
  return null;
}

// Ashtama Shani (அஷ்டம சனி): Saturn transiting the 8th house from natal
// Moon — a separately-named, traditionally significant period distinct
// from Sade Sati.
export function isAshtamaShani(saturnHouseFromMoon: number): boolean {
  return saturnHouseFromMoon === 8;
}

// Janma Shani (ஜென்ம சனி): literally "Saturn upon one's birth (rashi)" —
// Saturn transiting the natal Moon's own sign. This is the same instant as
// Sade Sati's PEAK phase; the two names describe the same transit from
// different traditional framings (this overlap is intentional, not a bug —
// documented here since "Janma Shani" is used inconsistently across texts
// and this is the most literal, commonly-cited reading).
export function isJanmaShani(saturnHouseFromMoon: number): boolean {
  return saturnHouseFromMoon === 1;
}
