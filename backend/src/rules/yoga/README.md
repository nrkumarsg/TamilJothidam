# rules/yoga/ — Yoga Detection Engine (Phase 11, done)

Each yoga is an explicit, testable rule — never a text-search/keyword heuristic.

```ts
interface YogaRule {
  name: string;                 // e.g. "Gaja Kesari Yoga"
  evaluate(chart: JathakamData): YogaResult | null;
}

interface YogaResult {
  name: string;
  participatingPlanets: string[];
  participatingHouses: number[];
  strength: 'low' | 'moderate' | 'strong';
  interpretationKey: string;    // looked up in i18n/, not hard-coded prose
}
```

Initial rule set: Raja Yoga, Dhana Yoga, Gaja Kesari Yoga, Budha Aditya Yoga,
Neecha Bhanga Raja Yoga, Dharma Karma Adhipati Yoga, Vipareeta Raja Yoga,
Chandra Mangala Yoga. Each rule file documents the classical source/logic it
implements in a comment above the `evaluate()` function.

## Implementation

- `yoga.types.ts` — `YogaChartInput`/`YogaRule`/`YogaResult` as specified
  above, plus `YogaChartPlanet`/`YogaChartHouse`, a deliberately narrow view
  built once from already-persisted Planet/House rows (no rule reaches back
  into raw ephemeris data).
- `yoga-helpers.ts` — `lordConnection()` (conjunction/exchange/mutual-aspect
  between two house lords, reusing `jathakam/house-analysis.ts`'s
  `aspectedHouses()`) and `aggregateLordConnections()`, shared by the three
  "Raja Yoga family" rules (Raja, Dhana, Dharma Karma Adhipati).
- One file per yoga (`raja-yoga.ts`, `dhana-yoga.ts`, etc.) — each documents
  its classical source and, where the classical literature offers multiple
  recognized conditions (Neecha Bhanga Raja Yoga, Dhana Yoga), states
  explicitly which single condition is implemented and that the others are
  not — never silently claiming more completeness than is actually there.
- `yoga-names.ts` — short bilingual display description per yoga (display
  metadata only; full narrative interpretation is Phase 13's job).
- `index.ts` — `ALL_YOGA_RULES`, run once by `JathakamService.create()` and
  persisted as `Yoga` rows (a fixed natal fact, computed once like
  planets/houses — not recomputed on every read, unlike transits).

Verified with 19 unit tests against hand-built charts, then independently
against a full by-hand analysis of all 8 yogas for the known reference
chart (predicted exactly one hit, Raja Yoga, with specific participating
planets/houses/strength) — see the Phase 11 entry in the root README.
