import { Graha } from '@prisma/client';
import { DASHA_ORDER, DAYS_PER_YEAR, TOTAL_CYCLE_YEARS, nakshatraLordGraha, yearsOf } from './vimshottari-reference';

export interface DashaNode {
  graha: Graha;
  startJd: number;
  endJd: number;
  children: DashaNode[]; // MAHA nodes hold ANTAR children; ANTAR nodes hold PRATYANTAR children; PRATYANTAR nodes are leaves
}

const NAKSHATRA_SPAN_DEGREES = 360 / 27;

// How far past birth to generate Mahadasha coverage. One full Vimshottari
// cycle is 120 years, but because birth always falls partway through the
// first Mahadasha, covering a full 120 years *from birth* needs a bit into
// a second cycle — 130 years gives comfortable margin beyond any realistic
// human lifespan in this system.
const COVERAGE_YEARS = 130;

// Builds the full Mahadasha -> Antardasha -> Pratyantardasha tree from the
// Moon's nakshatra placement at birth (spec §8: exact dates only, never
// approximated). All arithmetic is done in Julian Day space (birthJd + N
// days), sidestepping timezone/calendar reconstruction entirely — the
// birth instant is already an exact JD from the calculation engine.
export function buildDashaTree(moonNakshatra: number, moonLongitude: number, birthJd: number): DashaNode[] {
  const nakshatraStart = (moonNakshatra - 1) * NAKSHATRA_SPAN_DEGREES;
  const elapsedInNakshatra = moonLongitude - nakshatraStart;
  const elapsedFraction = elapsedInNakshatra / NAKSHATRA_SPAN_DEGREES;

  const firstLord = nakshatraLordGraha(moonNakshatra);
  let lordIndex = DASHA_ORDER.indexOf(firstLord);
  // Elapsed portion of the FIRST Mahadasha only — every subsequent
  // Mahadasha (and, within it, every antardasha/pratyantardasha) starts
  // fresh with zero elapsed time.
  let elapsedDays = elapsedFraction * yearsOf(firstLord) * DAYS_PER_YEAR;

  const targetCoverageDays = COVERAGE_YEARS * DAYS_PER_YEAR;
  let coveredDays = 0;
  let cursorJd = birthJd;
  const mahadashas: DashaNode[] = [];

  let safety = 0;
  while (coveredDays < targetCoverageDays && safety < 20) {
    safety++;
    const lord = DASHA_ORDER[lordIndex % 9];
    const fullDays = yearsOf(lord) * DAYS_PER_YEAR;
    const balanceDays = fullDays - elapsedDays;
    const start = cursorJd;
    const end = cursorJd + balanceDays;

    // 2 = build this Mahadasha's Antardashas, and let each of those
    // recurse one further level to build its own Pratyantardashas.
    const children = buildChildren(lord, start, fullDays, elapsedDays, 2);

    mahadashas.push({ graha: lord, startJd: start, endJd: end, children });

    cursorJd = end;
    coveredDays += balanceDays;
    elapsedDays = 0;
    lordIndex++;
  }

  return mahadashas;
}

// Builds the 9 sub-periods of a parent period (Antardashas of a Mahadasha,
// or Pratyantardashas of an Antardasha), starting the classical order at
// the parent's own lord. When the parent itself started partway through
// (elapsedDaysIntoParent > 0 — only ever true for the single unbroken
// chain traced down from the birth moment), the earliest sub-periods that
// fall entirely before birth are skipped outright (not emitted at all —
// they are not part of this person's life), the sub-period birth actually
// falls in is truncated to its remaining balance, and everything after
// that is full-length.
function buildChildren(
  parentLord: Graha,
  parentStartJd: number,
  parentFullDays: number,
  elapsedDaysIntoParent: number,
  levelsRemaining: number,
): DashaNode[] {
  if (levelsRemaining <= 0) return [];

  const startIndex = DASHA_ORDER.indexOf(parentLord);
  let cursorJd = parentStartJd;
  let remainingElapsed = elapsedDaysIntoParent;
  const children: DashaNode[] = [];

  for (let i = 0; i < 9; i++) {
    const childLord = DASHA_ORDER[(startIndex + i) % 9];
    // This child's full duration, proportional to the parent's own
    // (possibly-already-scaled-down-by-an-ancestor) full timescale.
    const childFullDays = (parentFullDays * yearsOf(childLord)) / TOTAL_CYCLE_YEARS;

    if (remainingElapsed >= childFullDays) {
      // Entirely before birth — skip without advancing the cursor, since
      // no time in the emitted (post-birth) timeline is consumed by it.
      remainingElapsed -= childFullDays;
      continue;
    }

    const childElapsedDays = remainingElapsed;
    const childDurationDays = childFullDays - childElapsedDays;
    remainingElapsed = 0;

    const start = cursorJd;
    const end = cursorJd + childDurationDays;
    const grandchildren = buildChildren(childLord, start, childFullDays, childElapsedDays, levelsRemaining - 1);

    children.push({ graha: childLord, startJd: start, endJd: end, children: grandchildren });
    cursorJd = end;
  }

  return children;
}

// Julian Day (UT) -> JS Date. JD 2440587.5 = 1970-01-01T00:00:00Z (the
// standard Julian Day value of the Unix epoch).
export function jdToDate(jd: number): Date {
  return new Date(Math.round((jd - 2440587.5) * 86400000));
}
