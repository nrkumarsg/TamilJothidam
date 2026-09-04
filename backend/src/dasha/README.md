# dasha/ — Vimshottari Dasha Engine (Phase 9)

Computes Mahadasha / Antardasha / Pratyantardasha start and end dates from the
Moon's nakshatra position at birth, using the standard 120-year Vimshottari cycle
and planetary periods. Exact dates only — never approximated or invented.

Exposes: past dasha, current dasha (as of "now" or a queried date), next dasha,
and the full period tree for the life prediction / timeline modules to consume.

## Implementation

- `vimshottari-reference.ts` — the fixed 120-year cycle (9 grahas, uncontested
  fixed year-lengths) and nakshatra-lord lookup.
- `dasha.util.ts` — `buildDashaTree()`, the pure recursive algorithm. All
  three levels handle the birth-boundary case uniformly: an "elapsed days
  into this parent" value is threaded down; early sub-periods that would be
  entirely pre-birth are skipped outright (not emitted), the sub-period
  birth actually falls in is truncated, and everything after is full-length.
  Arithmetic happens in Julian Day space via `jdToDate()` — no timezone
  reconstruction needed since the calculation engine already gives an exact
  birth JD.
- `dasha.flatten.ts` — flattens the in-memory tree into ~900 `Dasha` rows
  (client-generated UUIDs so parent/child links don't need per-row DB
  round-trips) for one `createMany` call.
- `dasha.service.ts` — `createForJathakam()` (called once, from
  `JathakamService.create()`) and `getSummary(jathakamId, asOf)`, a cheap
  date-range lookup over the already-persisted, immutable rows.
- `GET /jathakams/:id/dasha?asOf=` — past/current/next at all three levels
  plus the full Maha+Antar timeline (Pratyantardasha detail is available in
  the DB per-period but not nested into every timeline entry, to keep the
  response size reasonable).

Verified via self-consistency invariants (child durations sum exactly to
the parent's at every level; zero gaps/overlaps) and an independent hand
recomputation against a live API response for the known reference chart —
see the Phase 9 entry in the root README for the full trace.
