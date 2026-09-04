# calculation/ — Astronomical Calculation Engine (Phase 4)

Deterministic wrapper around the Swiss Ephemeris (`sweph` npm bindings). Computes,
for a given UTC datetime + geographic coordinates:

- Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu, Lagna longitudes
- Sidereal positions using the configured ayanamsa (default: Lahiri — see
  `DEFAULT_AYANAMSA` in `.env`, stored per-chart in `calculation_settings`)
- Retrograde status, combustion, exaltation/debilitation/own-sign/friendly/enemy sign
- Nakshatra, pada, and sign for each graha

This module contains **no interpretation logic and no AI calls**. It is pure
astronomy in → structured numbers out. Everything downstream (jathakam, dasha,
transits, yoga/dosha rules) consumes its output; nothing upstream of it is allowed
to override its numbers, including the AI interpretation engine.

## Implementation (Phase 4)

- `ephemeris.service.ts` — thin wrapper around `sweph`, running in
  **Moshier mode** (`SEFLG_MOSEPH`): no external ephemeris data files to
  download, ~arcsecond precision, valid ~3000 BCE–3000 CE — more than
  sufficient given birth-time entry error typically exceeds this by orders
  of magnitude. Ayanamsa is set once (Lahiri, `SE_SIDM_LAHIRI`) and every
  longitude request uses `SEFLG_SIDEREAL` so results come back already
  sidereal.
- `reference-data.ts` — classical lookup tables (sign lords, exaltation/
  debilitation, own signs, natural friendship, combustion orbs), each
  citing its classical source in a comment, per the project's rule that
  every astrology rule documents where it comes from.
- `derivation.ts` — pure functions turning a longitude into sign/nakshatra/
  pada/house, plus dignity, combustion, and a simplified strength score
  (explicitly **not** full classical Shadbala — see the doc comment on
  `simplifiedStrengthScore` for why that's out of scope for this phase).
- `calculation.service.ts` — orchestrates the above into `computeChart()`,
  returning Lagna + the 9 grahas as `GrahaResult[]`.
- `POST /calculation/preview` — debug/audit endpoint (spec §36) for manual
  verification; does not persist. Phase 5 calls `CalculationService`
  directly and writes the result to the `Jathakam`/`Planet`/`House` tables.
