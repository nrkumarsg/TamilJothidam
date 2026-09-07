# reports/ — Full Report Generator (Phase 15)

Assembles the fixed 34-section report structure (spec §28, defined in
`backend/src/i18n/glossary.ts`'s `REPORT_SECTIONS`) into one table of
contents via `GET /jathakams/:id/report?language=`. This module does not
compute or duplicate any chart data itself — it classifies each of the 34
sections by what already exists from earlier phases:

- **`chart_data`** (11 sections) — lagna_rasi, nakshatra_pada,
  planetary_positions, rasi_chart, navamsa_chart, house_analysis, yogas,
  doshas, vimshottari_dasha, current_dasha, transit_results. Already fully
  computed and servable via `GET /jathakams/:id`, `GET /jathakams/:id/dasha`,
  and `GET /jathakams/:id/transits` — the report entry just says "this data
  exists," the frontend keeps rendering it with the existing panels
  (`SouthIndianChart`, `HouseAnalysisTable`, `YogaPanel`, `DoshaPanel`,
  `DashaPanel`, `TransitPanel`).
- **`ai_pending` / `ai_generated`** (23 sections) — summary, health, wealth,
  career, marriage, spirituality (mapped to Phase 13's `karma` prediction
  section), future_life (mapped to `future`), plus the 16 that closed out
  the full 34-section structure: business, family, children, education,
  foreign_travel, property, the four favorable_* sections, remedies,
  life_timeline, past_life, present_life, graha_phalan, final_summary.
  Carries the cached `Prediction` row if one has been generated yet, `null`
  otherwise. `unavailable` remains a possible status (see
  `report.types.ts`) but nothing currently produces it — all 34 sections
  resolve to either `chart_data` or an AI prediction section.

## Palan period (Phase 15, user-requested addition)

Alongside the report assembler, this phase also added a way for the user to
choose how far ahead an AI prediction should reason before generating it —
see `backend/src/ai/palan-period.types.ts`. Four modes: `CURRENT` (default,
unchanged Phase 13 behavior — current dasha/bukti only), `NEXT_YEARS` (a
window from today), `WHOLE_LIFE` (the full persisted dasha timeline), and
`UNTIL_DASHA` (truncated to a chosen future Mahadasha, optionally narrowed
to one of its Antardashas). Passed as an optional `palanPeriod` field on
`POST /jathakams/:id/predictions`.

**Caching tradeoff, documented rather than solved**: `Prediction` stays
keyed on `[jathakamId, section, language]` (no schema change) — a non-
`CURRENT` palan period always bypasses the cache read and regenerates, but
still overwrites that same row on upsert. There is no separate cached
variant per period; requesting a look-ahead view and then reloading the
page later shows whichever variant was generated most recently. Extending
the unique key with a period dimension would fix this properly but was
judged unnecessary schema complexity for a feature aimed at occasional,
explicit look-ahead requests rather than one every viewer hits routinely.

## pdf/ — PDF generation (Phase 16, spec §40)

`POST /jathakams/:id/report/pdf?language=` renders the same 34-section
structure (this time with real content, not just pointers — see below) to
a PDF via headless Chromium, saves it under `backend/generated-reports/`
(gitignored — regenerable from DB data), and upserts the first-ever
`Report` row (now unique on `[jathakamId, language]`, migration
`20260904120000_report_unique_jathakam_language`). `GET .../report/pdf`
streams the most recently generated file back (404 until POST has run
once).

- **`pdf-renderer.ts`** — drives `puppeteer-core` (pinned to `24.43.1`;
  `25.x` ships ESM-only and can't be `require()`d from this CommonJS
  backend, breaking both Jest and the running app — see this file's
  install history if bumping the version). Deliberately `puppeteer-core`,
  not `puppeteer`: no bundled ~300MB Chromium download, matching this
  project's no-admin/portable-tooling stance (portable Postgres, Moshier-
  mode ephemeris). Drives whatever Chromium-based browser is already
  installed — auto-detects Edge/Chrome/Chromium at their usual paths, or
  reads `PUPPETEER_EXECUTABLE_PATH` if set. Throws `ServiceUnavailableException`
  with clear guidance if none is found, same pattern as `AnthropicProvider`'s
  missing-API-key handling.
- **`report-template.ts`** — builds the actual HTML. Reuses `ReportService`'s
  34-section classification but, unlike the JSON report endpoint, renders
  real content for every `chart_data` section (tables for planetary
  positions/houses/dasha timeline/transits, an embedded SVG for the rasi
  and navamsa charts) since a PDF has no follow-up API call to make —
  everything has to be on the page. Embeds Noto Sans Tamil
  (`backend/assets/fonts/NotoSansTamil-Regular.ttf`, SIL OFL licensed) as a
  base64 `@font-face` for correct Tamil Unicode rendering regardless of
  what fonts are on the host (spec §40); falls back to the font stack
  (`Nirmala UI`, `Noto Sans`) if the font file is ever missing rather than
  failing generation.
- **`rasi-chart-svg.ts`** — the South Indian chart grid, ported from
  `frontend/src/components/chart/SouthIndianChart.tsx` as a plain string
  builder (no React/browser needed server-side). Kept in sync by hand;
  there's no shared package between frontend and backend in this monorepo.

**AI sections in the PDF are whatever's cached, not freshly generated**:
matches `ReportService`'s `ai_pending`/`ai_generated` split — sections with
no `Prediction` row yet render an honest "not yet generated" placeholder
rather than blocking PDF generation on live AI calls (which would be slow
and, per Phase 13's cost-consciousness, unexpected for the user to trigger
by clicking "download PDF"). Regenerate predictions first, then download,
to include more.
