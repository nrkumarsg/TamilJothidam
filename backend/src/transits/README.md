# transits/ — Gochara (Transit) Engine (Phase 10)

Compares current/queried planetary positions (Saturn, Jupiter, Rahu, Ketu, Mars
at minimum) against the natal Moon, Lagna, and relevant houses. Computes Sade
Sati, Ashtama Shani, Janma Shani, Jupiter transit, and Rahu/Ketu transit effects.

Transit output is always tagged separately from natal-chart output so the report
generator and AI layer can clearly label "ஜாதக அடிப்படையிலான பலன்" (natal-chart
result) vs "கோச்சார பலன்" (transit result).

## Implementation

- `transit-flags.ts` — `sadeSatiPhase()` (RISING/PEAK/SETTING for Saturn in
  the 12th/1st/2nd house from natal Moon), `isAshtamaShani()` (8th from
  Moon), `isJanmaShani()` (1st from Moon — the same instant as Sade Sati's
  PEAK; both names are used for it across different texts, documented as
  intentional overlap, not a bug).
- `transits.service.ts` — `getTransits(jathakamId, asOf)`: loads the natal
  Moon/Lagna sign from the already-persisted `Planet` rows, gets each
  transit graha's sidereal longitude from `EphemerisService` (Phase 4,
  exported from `CalculationModule` for exactly this reuse — no new
  ephemeris code needed), and derives house-from-Moon/house-from-Lagna with
  the same whole-sign `houseFromSign()` used everywhere else in the
  pipeline. Computed live on every request — a transit snapshot is stale
  the instant it's computed, so nothing is persisted to the `Transit` table.
- `GET /jathakams/:id/transits?asOf=` — defaults to the current date.

Verified against real-world facts (Saturn's 2025-27 transit through
Meenam/Pisces; Rahu/Ketu's near-constant retrograde motion) via independent
raw `sweph` calls, then every derived house and flag was hand-recomputed
against a live API response — see the Phase 10 entry in the root README.
