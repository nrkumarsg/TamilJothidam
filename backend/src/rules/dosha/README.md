# rules/dosha/ — Dosha Detection Engine (Phase 12, done)

Same rule-based architecture as `rules/yoga/`. Initial set: Sevvai Dosham
(Manglik), Kala Sarpa, Pitru Dosha indicators, Grahana-related combinations.

Every dosha result carries a `severity: 'low' | 'moderate' | 'strong'` and the
explicit rule that triggered it. Interpretation copy must follow the tone rules
in docs/ARCHITECTURE.md § Content & Safety Guardrails — explain the traditional
meaning, never use fear-based language ("your life will be destroyed" is banned).

## Implementation

- `dosha.types.ts` — `DoshaChartInput`/`DoshaRule`/`DoshaResult`, same
  narrow-view pattern as `rules/yoga/yoga.types.ts`. `DoshaResult.ruleTriggered`
  is a machine-readable audit string (e.g. "Sun conjunct Rahu in house 12"),
  kept deliberately separate from the bilingual display description.
- `sevvai-dosham.ts` — Mars in houses {1,2,4,7,8,12} from Lagna, graded by
  house (7th/8th = STRONG).
- `kala-sarpa-dosha.ts` — the real geometric test: all 7 classical grahas
  fall within one 180° semicircle of the Rahu-Ketu axis.
- `pitru-dosha.ts` — explicitly documented as having no single canonical
  classical definition (a folk/regional concept, unlike the more
  standardized yogas); implements the most commonly cited indicators only
  (Sun-node conjunction; a node or the 9th lord affecting the 9th house).
- `grahana-dosha.ts` — a luminary (Sun/Moon) conjunct a node. Documented as
  intentionally overlapping Pitru Dosha's Sun-node condition — the same
  "two names for one placement" pattern as Janma Shani/Sade Sati (Phase 10).
- `dosha-names.ts` — bilingual descriptions, every one written to the
  required "இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில்..." framing, enforcing the
  no-fear-language rule structurally rather than just by convention.
- `index.ts` — `ALL_DOSHA_RULES`, run once by `JathakamService.create()`
  alongside the yoga engine and persisted as `Dosha` rows.

Verified with 12 unit tests (which caught a real test-data bug: Sun and
Ketu had accidentally been placed in the same house in three test charts,
so the wrong branch fired before the intended one — fixed and reverified),
then independently against a full by-hand analysis of all 4 doshas for the
known reference chart (predicted exactly 2 hits, both from one Sun-Rahu
conjunction, and 2 misses including a genuine Kala Sarpa near-miss) — see
the Phase 12 entry in the root README.
