# i18n/ — Tamil/English Terminology & Section Labels (Phase 14)

Two distinct kinds of Tamil text in this system (see docs/ARCHITECTURE.md
§ Tamil Language Architecture — read that before adding strings here):

1. **Deterministic labels** (this module): fixed report section headings and
   core spec terminology. A hand-maintained glossary (`glossary.ts`), never
   AI-generated, guaranteed grammatically correct. Supports `ta` (default)
   and `en`; the `Locale` type is deliberately not widened to `si`/`ml`/`hi`/
   `te`/`kn`/`ms` (spec §27's future locales) until real translations exist.
2. **AI-generated prose** (interpretation paragraphs): produced by the AI layer
   using this glossary's terms, NOT stored here.

## What's actually in `glossary.ts`

- `GRAHA_NAMES` — full graha names (e.g. "சூரியன்"/"Sun"), distinct from
  `frontend/src/components/chart/graha-labels.ts`'s short chart-cell
  abbreviations (e.g. "சூரி"/"Su").
- `CORE_TERMS` — the exact terminology list spec §26 requires the AI layer's
  Tamil output to use (ஜாதகம், லக்னம், ராசி, நட்சத்திரம், பாதம், பாவம்,
  பாவாதிபதி, தசை, புத்தி, கோச்சாரம், யோகம், தோஷம், பரிகாரம், and 8 life-area
  terms).
- `REPORT_SECTIONS` — all 34 report section headings from spec §28, in
  order, each with a machine-readable `slug`. This module only owns the
  *headings*; Phase 15 (full report generator) assembles the actual
  per-section content. 7 of the 34 sections already have real AI-generated
  content today via `backend/src/ai/prediction.types.ts`'s
  `PREDICTION_SECTIONS` — `basic_reading`/`health`/`wealth`/`career`/
  `marriage` line up 1:1 with sections 1/17/18/19/21; `karma` and `future`
  are related-but-not-identical to sections 27 (spirituality) and 16
  (future_life) and were kept as their own Phase 13 slugs rather than
  force-renamed to match.

## What NOT already covered here (deliberately, by prior-phase design)

Sign names, nakshatra names, and house significations already have their
own hand-maintained bilingual tables — `backend/src/jathakam/names.ts` and
`backend/src/jathakam/house-analysis.ts`'s `HOUSE_SIGNIFICATIONS` — each
explicitly scoped to its own module rather than centralized here (see the
comments at the top of those files). Yoga/dosha display descriptions are
similarly scoped to `backend/src/rules/{yoga,dosha}/*-names.ts`. This
glossary is additive, not a refactor of those — consolidating them was
judged out of scope for Phase 14.

## Consuming it

`GET /i18n/glossary` (`i18n.controller.ts`) returns the whole glossary as
JSON — added so it has a real, testable consumer today, the same way
Phase 4 added `POST /calculation/preview` ahead of its eventual caller.
Phase 15's report generator, being backend code itself, can also just
`import` `glossary.ts` directly without going through HTTP.
