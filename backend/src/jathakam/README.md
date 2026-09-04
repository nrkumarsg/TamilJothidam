# jathakam/ — Jathakam Engine (Phases 5-8, all done)

Builds the chart structure from raw calculation output and persists it.
Output is the structured jathakam (Jathakam + Planet + House rows, cached
also as `chartData` JSON) — the single source of truth handed to the dasha,
transit, yoga/dosha, and AI layers (see docs/ARCHITECTURE.md § Data Model).

## Done (Phase 5)

- `JathakamService.create(profileId)` — loads the birth profile, calls
  `CalculationService`, and persists Lagna + the 9 grahas as `Planet` rows
  and all 12 whole-sign houses as `House` rows (sign, lord, lordHouse,
  occupants — spec §7 "அதிபதி எங்கு இருக்கிறார்?")
- `names.ts` — Tamil/English sign + nakshatra name lookup, used only to
  enrich API responses for display (numeric indices stay authoritative;
  `House` rows carry `signName` too, added in Phase 6 for the chart renderer)
- `POST /jathakams`, `GET /jathakams/:id`, `GET /jathakams/profile/:profileId`

## Done (Phase 6, frontend)

- `frontend/src/components/chart/SouthIndianChart.tsx` — SVG South Indian
  style Rasi chart: fixed 4x4 grid (signs never move; only which sign is
  "house 1" changes), Lagna marker, house numbers, graha abbreviations with
  combust/retrograde styling. Rendered on the `/new` wizard results screen.

## Done (Phase 7)

- `divisional-charts.ts` — `DivisionalChartCalculator` interface (so
  D2/D3/D4/D7/D10/D12/D16/D20/D24/D27/D30/D40/D45/D60 can be added later
  without restructuring) with `navamsaCalculator` (D9) as the first
  implementation: `(signIndex*9 + navamsaIndex) % 12`, verified against a
  hand-derived per-modality truth table for all 12 signs
- Persisted as a `DivisionalChart` row (`chartType: 'D9'`) per jathakam;
  `JathakamSummary.navamsa` re-derives houses in the same shape as the D1
  `houses`, so `SouthIndianChart` renders it with no component changes
  (`centerLabel="நவாம்சம்"`)

## Done (Phase 8)

- `house-analysis.ts` — `HOUSE_SIGNIFICATIONS` (fixed classical meaning per
  house number, spec §7 item 1), graha drishti (`aspectedHouses`: universal
  7th-house aspect for every graha, plus Mars/Jupiter/Saturn's special
  aspects per BPHS ch. 5 — Rahu/Ketu deliberately get only the uncontested
  7th, same reasoning as their dignity handling in reference-data.ts), and
  benefic/malefic classification (`isNaturalBenefic`/`isNaturalMalefic`,
  documented as the basic convention, not the full conditional rules)
- `JathakamService.buildHouseAnalysis()` combines that reference data with
  already-persisted Planet/House rows — no new astronomical computation, no
  schema change — into `JathakamSummary.houseAnalysis` (signification,
  lord/lordHouse, occupants, conjunction flag, aspecting grahas, benefic/
  malefic influence, and a strength proxy = the house lord's strengthScore).
  Every `NamedPlanet` also gets `aspectsHouses` (spec §6 "எந்த பாவங்களை பார்வை
  செய்கிறது?"). Item 8 ("வாழ்க்கையில் அதன் தாக்கம்") is deliberately not built
  here — that is AI-generated prose, Phase 13.
- `frontend/src/app/new/HouseAnalysisTable.tsx` — 12-row table rendered on
  the `/new` results screen, bilingual, horizontally scrollable.
