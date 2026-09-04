import { Graha } from '@prisma/client';
import { DashaPeriodDto } from '../dasha/dasha.service';
import { BilingualLabel } from '../jathakam/names';
import { grahaName } from '../i18n/glossary';

// How far into the future an AI-generated prediction ("palan") should
// reason, per the user's explicit request (Phase 15) — the AI never picks
// its own time horizon. CURRENT (default, and the only behavior before
// this feature existed) reasons only from the current Maha/Antar/
// Pratyantar dasha, matching every prompt template written in Phase 13.
// The other three modes additionally supply a `dashaTimeline` slice of the
// full life dasha tree (already computed once in Phase 9 — nothing new is
// calculated here, only filtered/truncated).
export const PALAN_PERIOD_MODES = ['CURRENT', 'NEXT_YEARS', 'WHOLE_LIFE', 'UNTIL_DASHA'] as const;
export type PalanPeriodMode = (typeof PALAN_PERIOD_MODES)[number];

export interface PalanPeriodOptions {
  mode: PalanPeriodMode;
  // NEXT_YEARS only; defaults to 5 when omitted.
  years?: number;
  // UNTIL_DASHA only. If the requested graha isn't found in the timeline
  // (shouldn't normally happen — Vimshottari covers all 9 grahas within the
  // ~130-year generated window), the full timeline is returned unfiltered
  // rather than silently producing an empty one.
  untilMahadashaGraha?: Graha;
  // UNTIL_DASHA only, further narrows within the target Mahadasha.
  untilAntardashaGraha?: Graha;
}

export type MahadashaWithAntardashas = DashaPeriodDto & { antardashas: DashaPeriodDto[] };

export function buildDashaTimeline(
  mahadashaList: MahadashaWithAntardashas[],
  options: PalanPeriodOptions,
  asOf: Date,
): MahadashaWithAntardashas[] {
  switch (options.mode) {
    case 'CURRENT':
      return [];

    case 'WHOLE_LIFE':
      return mahadashaList;

    case 'NEXT_YEARS': {
      const years = options.years ?? 5;
      const windowEnd = new Date(asOf);
      windowEnd.setFullYear(windowEnd.getFullYear() + years);
      return mahadashaList
        .filter((m) => new Date(m.startDate) < windowEnd && new Date(m.endDate) > asOf)
        .map((m) => ({
          ...m,
          antardashas: m.antardashas.filter(
            (a) => new Date(a.startDate) < windowEnd && new Date(a.endDate) > asOf,
          ),
        }));
    }

    case 'UNTIL_DASHA': {
      if (!options.untilMahadashaGraha) return mahadashaList;
      const targetIndex = mahadashaList.findIndex((m) => m.graha === options.untilMahadashaGraha);
      if (targetIndex === -1) return mahadashaList;

      const truncated = mahadashaList.slice(0, targetIndex + 1);
      const last = truncated[truncated.length - 1];
      if (options.untilAntardashaGraha) {
        const antarIndex = last.antardashas.findIndex((a) => a.graha === options.untilAntardashaGraha);
        if (antarIndex !== -1) {
          truncated[truncated.length - 1] = { ...last, antardashas: last.antardashas.slice(0, antarIndex + 1) };
        }
      }
      return truncated;
    }
  }
}

// A human-readable (bilingual) description of the requested scope — sent
// to the AI as part of its instructions and available for the frontend to
// display back to the user as confirmation of what was requested.
export function describePalanPeriod(options: PalanPeriodOptions): BilingualLabel {
  switch (options.mode) {
    case 'CURRENT':
      return { ta: 'தற்போதைய தசை/புத்தி காலம் மட்டும்', en: 'Current dasha/bukti period only' };

    case 'NEXT_YEARS': {
      const years = options.years ?? 5;
      return { ta: `அடுத்த ${years} ஆண்டுகள்`, en: `Next ${years} years` };
    }

    case 'WHOLE_LIFE':
      return { ta: 'முழு ஆயுட்காலம்', en: 'Whole life' };

    case 'UNTIL_DASHA': {
      const maha = options.untilMahadashaGraha ? grahaName(options.untilMahadashaGraha) : null;
      const antar = options.untilAntardashaGraha ? grahaName(options.untilAntardashaGraha) : null;
      if (!maha) return { ta: 'குறிப்பிட்ட தசை வரை', en: 'Until a specific dasha' };
      return {
        ta: `${maha.ta} தசை${antar ? ` / ${antar.ta} புத்தி` : ''} வரை`,
        en: `Until ${maha.en} Mahadasha${antar ? ` / ${antar.en} Antardasha` : ''}`,
      };
    }
  }
}
