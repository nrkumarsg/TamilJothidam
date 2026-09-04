# test/regression/ — Reference-chart regression suite (Phase 19, spec §38)

Spec §38: *"Create regression tests using known reference calculations.
Every change to the astrology calculation engine must run the complete test
suite."*

```bash
npm run test:regression --workspace backend   # this suite only
npm test --workspace backend                  # everything
```

## Why this exists on top of the per-module tests

Phases 4-18 each verified **one** chart by hand — Chennai, 1990-01-15
08:30 IST. That left two real gaps:

1. **One chart is not a sample.** The engine could have been badly wrong for
   a southern-hemisphere birth, a negative UTC offset, a DST-era birth, or
   an extreme latitude, and nothing would have caught it.
2. **Hand-written assertions only cover what they name.** Changing the
   ayanamsa, a dignity table, or the navamsa formula would sail past every
   existing test that didn't happen to assert that exact field.

## The two layers

**`engine-invariants.spec.ts`** — pure, no database, runs in seconds.
Properties that must hold for *any* birth data, re-derived from first
principles inside the test rather than by calling the same helpers the
engine uses (checking `f` against `f` proves nothing): sign/nakshatra/pada
consistency with raw longitude, whole-sign house placement relative to the
Lagna, the Rahu-Ketu axis, determinism, and the timezone/location
behaviour whose absence caused a real bug in Phase 4. It also pins the
Sun's sidereal sign for each chart from the calendar alone, and pins the
deliberate choice of the **true** lunar node over the mean node.

**`chart-regression.e2e-spec.ts`** — the full production path (HTTP →
profile → jathakam → calculation → houses → navamsa → yoga/dosha rules →
dasha → transits → report) for all six reference charts, asserting
structural invariants and capturing golden-master snapshots.

## What the golden snapshots do and don't claim

For **chennai-1990** they lock in output verified by hand across Phases
4-18 (its single Raja Yoga, its two doshas from one Sun-Rahu conjunction,
its dasha dates) — those specific facts are also re-asserted explicitly at
the bottom of the spec, so they survive even a careless snapshot update.

For the **other five charts** the snapshots lock in *current* behaviour so
future drift is caught. That is drift detection, not a claim that a human
independently confirmed every number. What *is* independently verified for
all six lives in the invariant blocks and in each chart's
`expectedSunSignIndex`.

This distinction was demonstrated, not assumed: introducing a deliberate
off-by-one into the navamsa formula failed all six golden snapshots while
**every invariant test still passed** — a shifted navamsa still has twelve
houses and nine grahas. The two layers catch different things, which is
why both are here.

## Updating snapshots — deliberately

`jest -u` will happily bless wrong output. Before running
`npm run test:regression:update --workspace backend`:

1. Know which engine change you made and why the output *should* move.
2. Read the snapshot diff. A change to one rule should not move planetary
   longitudes; a change to the ayanamsa should move nearly everything.
3. Confirm the explicit assertions still pass — those are not snapshots and
   will not be silently rewritten.

## Reference charts

| Chart | What it stresses that the others don't |
|---|---|
| `chennai-1990` | The canonical hand-verified baseline for every earlier phase |
| `sydney-1985` | Southern hemisphere (negative latitude) with summer DST (+11) |
| `new-york-1975` | Negative longitude *and* negative UTC offset, historic EDT |
| `london-2000-midnight` | A few minutes past midnight — date-boundary handling |
| `singapore-2010` | Near-equatorial latitude (~1°N) |
| `reykjavik-1999` | 64°N, the hardest case for ascendant/house maths; also `UNKNOWN` birth-time accuracy |

## Not covered here

AI-generated interpretation text is deliberately excluded: it is
non-deterministic and needs a live API key, so these tests run against the
fake provider used elsewhere in the e2e suite. Snapshotting fake text would
assert nothing. What *is* covered is that every deterministic bilingual
label reaches the client populated in both Tamil and English, and that the
34-section report renders identically in structure under both languages.
