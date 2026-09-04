# Tamil Jathakam AI Platform

A production-grade Tamil Vedic Astrology (Jathakam) platform: deterministic
astronomical calculation, dasha/transit/yoga/dosha rule engines, and an AI
interpretation layer that explains — but never invents — the calculated chart.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full pipeline,
database schema, AI architecture, Tamil language design, and phased plan.

## Status

**Phase 1 complete**: monorepo scaffold, NestJS backend with a health check,
Next.js frontend shell, local Postgres+pgvector via Docker Compose.

**Phase 2 complete**: Prisma schema for all 15 tables (`backend/prisma/schema.prisma`),
initial migration applied and verified against a live Postgres instance, Prisma
wired into the NestJS app (`PrismaModule`/`PrismaService`), integration test
covering the full user → profile → jathakam → planet relation chain.

**Phase 3 complete**: birth-data intake. `GET /locations/search` (OpenStreetMap
Nominatim, no API key) and `GET /locations/timezone` (offline `tz-lookup` +
`luxon`, historically DST-aware) resolve a searched place to lat/lng/timezone;
`POST /profiles` persists a validated birth profile + location (manual
lat/lng/timezone correction supported). Frontend: a 3-step intake wizard at
`/new` (birth details → birth place search → calculation settings), fully
bilingual (தமிழ்/English toggle), wired to a "புதிய ஜாதகம் உருவாக்கு" button on
the dashboard. Verified end-to-end in-browser against live Nominatim data and
the local Postgres.

**Phase 4 complete**: astronomical calculation engine (`backend/src/calculation/`),
built on `sweph` (Swiss Ephemeris bindings, Moshier mode — no ephemeris data
files needed). `CalculationService.computeChart()` takes birth date/time/
timezone/lat/lng and returns Lagna + all 9 grahas with sidereal longitude,
sign, degree, nakshatra, pada, whole-sign house, retrograde, combustion,
classical dignity (exaltation/debilitation/own/friendly/enemy/neutral, with
sources cited per graha), and a documented simplified strength score. Purely
deterministic — no AI, no DB writes. `POST /calculation/preview` exposes it
for debugging (spec §36). 31/31 tests pass, including integration tests
validated against Makara Sankranti (a verifiable real-world fact) and a
determinism check. **Caught and fixed a real bug** during testing: the
engine wasn't converting local birth time to UTC before computing the
Julian Day (it silently used local wall-clock digits as if they were UTC) —
a test asserting different timezones must yield different results caught it.

**Phase 5 complete**: jathakam engine (`backend/src/jathakam/`) — persists a
birth profile's calculated chart. `POST /jathakams {profileId}` loads the
profile+location, calls `CalculationService`, and writes `Jathakam` +
`Planet` (Lagna + 9 grahas) + `House` (12 whole-sign bhavas with lord,
lordHouse, occupants) rows; `GET /jathakams/:id` and
`GET /jathakams/profile/:profileId` read them back. Responses are enriched
with Tamil/English sign and nakshatra names (`jathakam/names.ts`) so
Lagna/Rasi/Nakshatra are actually readable, not just numeric indices. The
`/new` wizard now calls this automatically after saving a profile and shows
the result (லக்னம், ராசி, நட்சத்திரம் + பாதம்), with the birth-time-accuracy
warning surfaced again here since Lagna is time-sensitive. 37/37 tests pass.
**Caught and fixed a test-isolation bug**: every e2e spec shared one
dev-local user and each deleted it in `afterAll`, so when Jest ran spec
files concurrently one file's cleanup cascade-deleted another file's
still-in-use birth profile, intermittently breaking `jathakam.e2e-spec.ts`
with a foreign-key violation; fixed by having each spec delete only the
rows it created.

**Phase 6 complete**: South Indian style Rasi chart renderer
(`frontend/src/components/chart/SouthIndianChart.tsx`) — an SVG component
using the traditional fixed 4x4 grid layout (Aries fixed at top row, signs
proceed clockwise, center 2x2 merged into one open area). Shows, per cell:
the Tamil/English sign name, the house number relative to Lagna, a diagonal
marker on the Lagna cell, and each occupying graha's abbreviation —
colored red and marked when combust, suffixed "(வ)"/"(R)" when retrograde.
Backend: `House` rows in `JathakamSummary` now also carry `signName`
(small addition to `jathakam.service.ts`, same enrichment pattern as
planets). Wired into the `/new` wizard results screen, verified live in
the browser in both Tamil and English against the raw API response,
cell-by-cell. 37/37 backend tests still pass (no backend logic changed
beyond the one-field enrichment).

**Phase 7 complete**: Navamsa (D9) chart (`backend/src/jathakam/divisional-charts.ts`).
The classical per-modality navamsa rule (movable signs count from
themselves, fixed signs from the 9th sign, dual signs from the 5th) is
implemented as the standard unified formula `(signIndex*9 + navamsaIndex) % 12`,
behind a small `DivisionalChartCalculator` interface so D2/D3/etc. can slot
in later without restructuring. Persisted as a `DivisionalChart` row per
jathakam; `JathakamSummary.navamsa` exposes it in the same shape as the D1
`houses`, so the existing `SouthIndianChart` component renders it with zero
changes (`centerLabel="நவாம்சம்"`). Verified two ways: a hand-derived
per-modality truth table for all 12 signs in the unit tests, and — before
trusting the code — every graha's navamsa placement in a live API response
was independently recomputed by hand and matched exactly; the rendered D9
chart in the browser was then checked cell-by-cell against that same
response. 41/41 tests pass.

**Also added** (user request, kept for last): **Phase 21 — Panchangam
(daily almanac)** — date+location-based tithi/vaara/nakshatra/yoga/karana,
sunrise/sunset, and Rahu Kalam/Yamagandam/Gulika Kalam/Nalla Neram/
Durmuhurtham/Varjyam. Independent of the birth-chart pipeline (no profile
needed, just a date + place); recorded in docs/ARCHITECTURE.md § Phased plan.

**Phase 8 complete**: house (bhava) analysis (`backend/src/jathakam/house-analysis.ts`) —
deterministic only, stopping exactly where AI-generated interpretation prose
begins (spec §7 item 8, Phase 13). Adds: fixed classical house significations
(spec §7 item 1); graha drishti/aspects — the universal 7th-house aspect for
every graha plus Mars's 4th/8th, Jupiter's 5th/9th, and Saturn's 3rd/10th
special aspects (BPHS ch. 5; Rahu/Ketu deliberately given only the
uncontested 7th, matching how their dignity is already handled — see
reference-data.ts); conjunction detection (2+ occupants); benefic/malefic
classification (documented as the basic naisargika convention, not the
full conditional rules); and a house-strength proxy (the ruling lord's
already-computed strength score). All derived from already-persisted
Planet/House rows — no schema change, no new astronomical computation.
Rendered as a 12-row table on the `/new` results screen
(`HouseAnalysisTable.tsx`). Verified by hand-recomputing aspects and
benefic/malefic influence for every house against a live API response
before trusting the code, then checking the rendered table (Tamil and
English) against that same response row-by-row. 50/50 tests pass.

**Phase 9 complete**: Vimshottari Dasha engine (`backend/src/dasha/`).
Computes the full Mahadasha → Antardasha → Pratyantardasha tree from the
Moon's nakshatra position at birth — the tricky part is that birth falls
partway through periods at *all three levels simultaneously*: the earliest
sub-periods at each level that fall entirely before birth are skipped
outright (not just truncated), the period birth actually lands in is
truncated to its balance, and everything after that is full-length. All
arithmetic happens in Julian Day space (no timezone reconstruction needed —
the birth JD is already exact from Phase 4). Persisted once at jathakam
creation as ~900 `Dasha` rows (9-10 Mahadasha × 9 Antardasha × 9
Pratyantardasha, covering 130 years from birth); `GET /jathakams/:id/dasha?asOf=`
then does a cheap date-range lookup for past/current/next at every level
plus the full Maha+Antar life timeline — no recomputation. Verified with
self-consistency invariants (children durations sum exactly to their
parent's at every level, zero gaps/overlaps across the full timeline) *and*
a fully independent hand recomputation against a live API response for the
known reference chart, landing on the exact same Mahadasha, Antardasha, and
Pratyantardasha down to the day. Rendered on the `/new` results screen
(`DashaPanel.tsx`): current period at all three levels, previous/next
Mahadasha, and the full Mahadasha timeline. 69/69 tests pass.

**Phase 10 complete**: Transit/Gochara engine (`backend/src/transits/`).
Reuses Phase 4's `EphemerisService` directly (now exported from
`CalculationModule`) for arbitrary as-of dates instead of just birth
instants — no new astronomical calculation code needed, only the transit-
specific derivation. `GET /jathakams/:id/transits?asOf=` computes Saturn,
Jupiter, Rahu, Ketu, and Mars's current sidereal sign plus the house that
falls in counted from *both* natal Moon and natal Lagna, and flags Sade
Sati (with its Rising/Peak/Setting phase), Ashtama Shani, and Janma Shani —
all measured from natal Moon per classical convention. Computed live on
every request, not persisted: unlike the natal chart or Dasha, a transit
snapshot goes stale immediately, so there's nothing worth caching. Output
is a clearly separate `TransitSummary` (spec §9: never merged with natal-
chart data). Verified against real-world facts (Saturn's well-known 2025-27
transit through Meenam/Pisces, Rahu/Ketu's near-permanent retrograde
motion) computed independently via raw `sweph` calls, then every house-
from-Moon/house-from-Lagna value and every Saturn flag was hand-recomputed
against a live API response and matched exactly — including confirming
Ashtama Shani correctly fired while Sade Sati correctly did not, for the
same Saturn position. Rendered on the `/new` results screen
(`TransitPanel.tsx`), re-verified there against that same API response.
81/81 tests pass.

**Phase 11 complete**: Yoga engine (`backend/src/rules/yoga/`) — 8 rule-
based classical combinations (Raja, Dhana, Gaja Kesari, Budha Aditya,
Neecha Bhanga Raja, Dharma Karma Adhipati, Vipareeta Raja, Chandra Mangala
Yoga), each an explicit `YogaRule.evaluate()` function over already-
persisted Planet/House data — never a text-search heuristic. The
"Raja Yoga family" rules (Raja, Dhana, Dharma Karma Adhipati) share one
`lordConnection()` helper checking conjunction/mutual-aspect/exchange
between two house lords, reusing Phase 8's `aspectedHouses()` directly.
Every rule's classical source and any simplification is documented inline
(e.g. Neecha Bhanga implements the single most-taught cancellation
condition, not all ~6 recognized ones; Dhana Yoga implements the core
2nd/11th-lord version, not the full sprawling set of dhana combinations
found across texts) — the same "document what's implemented, don't
overclaim completeness" discipline used for dignity and transit aspects
earlier. Computed once at jathakam creation (yogas are a fixed natal fact,
like planets/houses) and persisted as `Yoga` rows. Verified two ways: 19
unit tests against hand-built charts (including the trap case of two
houses sharing the same lord correctly registering as *no* connection),
and — before trusting the code — a full hand analysis of all 8 yogas
against the known reference chart, predicting exactly one hit (Raja Yoga,
via two independent lord-conjunctions: house 1 & 5's lords meeting in
house 11, and house 7 & 9's lords meeting in house 12) and misses on the
other 7; the e2e test encoding that prediction passed on the first run
with the exact planets, houses, and STRONG strength predicted. Reconfirmed
live in the browser against that same output. 100/100 tests pass.

**Phase 12 complete**: Dosha engine (`backend/src/rules/dosha/`) — 4 rule-
based classical afflictions (Sevvai Dosham/Manglik, Kala Sarpa Dosha, Pitru
Dosha, Grahana Dosha), same explicit-rule architecture as the yoga engine,
persisted as `Dosha` rows once at jathakam creation. Spec §22's tone
requirement is enforced structurally, not just by convention: every
`DoshaResult` carries a machine-readable `ruleTriggered` audit string
(e.g. "Sun conjunct Rahu in house 12") separately from the bilingual
`description` shown to users, and every description is written to the
required "இந்த அமைப்பு பாரம்பரிய ஜோதிடத்தில்..." traditional-interpretation
framing — no fear-based language anywhere. Kala Sarpa Dosha implements the
real geometric test (all 7 classical grahas hemmed within one semicircle of
the Rahu-Ketu axis) rather than an approximation. Pitru Dosha is explicitly
documented as lacking one canonical classical definition (it's a folk/
regional concept, unlike the more standardized yogas) and implements the
most commonly cited indicators only. Verified two ways: 12 unit tests
(catching a real test-data bug along the way — Sun and Ketu had
accidentally been placed in the same house in three test charts, silently
triggering the wrong branch before the intended condition was reached —
fixed and reverified), and a hand analysis of all 4 doshas against the
known reference chart made *before* writing the test, predicting exactly
2 hits (Pitru Dosha and Grahana Dosha, both from the same Sun-Rahu
conjunction in house 12 — an intentional documented overlap) and misses on
Sevvai Dosham and Kala Sarpa Dosha (the latter a genuine near-miss: 6 of 7
grahas hemmed, broken by Jupiter). The e2e test encoding that prediction
passed on the first run. Reconfirmed live in the browser against that same
output — correct severities, correct rule-triggered text, correct
non-alarming tone throughout. 112/112 tests pass.

**Phase 13 complete**: AI interpretation engine (`backend/src/ai/`) — the
first layer that turns the deterministic chart JSON into Tamil/English
narrative prose, never the reverse. An `AIProvider` interface abstracts the
model backend (spec §32); `AnthropicProvider` is the first real
implementation (raw `fetch` to the Anthropic Messages API, no SDK
dependency), while OpenAI/Gemini/NVIDIA NIM/Ollama are named but return
`NotImplementedException` via a shared `unimplementedProvider()` factory
until built. `PromptLoaderService` loads versioned markdown templates from
`backend/prompts/{system.md, tamil/*.md, english/*.md}` at runtime — never
hard-coded in TypeScript — covering the initial 7-section working set
(`basic_reading`, `health`, `wealth`, `career`, `marriage`, `karma`,
`future`) in both languages. `system.md` encodes all 14 non-negotiable rules
from spec §25 (never alter positions, never invent, calibrated language,
no fear-based dosha framing, no medical/financial guarantees, past-life
content framed as tradition not fact, the mandatory closing disclaimer).
`InterpretationService.generate()` assembles a trimmed context JSON (profile,
lagna, rasi, planets, houseAnalysis, navamsa, yogas, doshas, current
Maha/Antar/Pratyantar dasha), calls the active provider, and persists the
result via `prisma.prediction.upsert()` — cached per `[jathakamId, section,
language]` unless `regenerate` is requested, since AI calls cost real time
and money. Each prediction is tagged with a confidence level
(`confidenceFromTimeAccuracy` — documented simplification: only birth-time
accuracy feeds this today, not the fuller multi-factor scoring spec §30
describes). RAG/vector retrieval was deliberately deferred (spec §25 marks
it optional; see `backend/src/rag/README.md` for the reasoning) — grounding
comes directly from the structured chart JSON instead. Frontend: a
per-section "AI விளக்கம் பெறு" button on the `/new` results screen
(`PredictionPanel.tsx`) — opt-in, not auto-generated, since each click is a
real API call. Verified with 22 unit tests (prompt-loader file resolution
and caching, confidence mapping, provider registry selection including every
unimplemented-provider path, the Anthropic provider's missing-key failure
path) plus a 6-test e2e suite (`test/predictions.e2e-spec.ts`) using a fake
`AIProvider` to verify the full pipeline — context assembly (the real
calculated chart data reaches the prompt), caching, `regenerate`, listing,
and 404/400 error paths — without depending on real network access. 140/140
backend tests pass. Verified live in the browser against the known reference
chart: the AI panel renders all 7 sections and correctly surfaces the
missing-`ANTHROPIC_API_KEY` error without crashing (a real key hasn't been
configured yet, so the success path is unverified end-to-end pending that).
Also fixed in this phase: the South Indian chart renderer now shows an
explicit "ல"/"La" text label on the Lagna cell (`SouthIndianChart.tsx`), not
just the diagonal corner marker, per user request.

**Phase 14 complete**: Tamil/English glossary (`backend/src/i18n/glossary.ts`)
— the hand-maintained, never-AI-generated source of truth for two things
spec §26/§28 require: the core Vedic-astrology terminology list (ஜாதகம்,
லக்னம், ராசி, நட்சத்திரம், பாதம், பாவம், பாவாதிபதி, தசை, புத்தி, கோச்சாரம்,
யோகம், தோஷம், பரிகாரம், and 8 life-area terms) and the fixed 34-section
report structure (spec §28's exact numbered heading list, each with a
machine-readable slug), plus full graha names (distinct from the frontend
chart renderer's short cell abbreviations like "சூரி"/"Su"). Deliberately
additive, not a refactor: sign/nakshatra names (`jathakam/names.ts`), house
significations (`house-analysis.ts`), and yoga/dosha descriptions
(`rules/{yoga,dosha}/*-names.ts`) already had their own hand-maintained
bilingual tables from earlier phases, explicitly scoped to their own modules
by design (see each file's header comment) — consolidating them was judged
out of scope here. The `Locale` type stays `'ta' | 'en'` only; spec §27's
future locales (Sinhala/Malayalam/Hindi/Telugu/Kannada/Malay) aren't
widened in until real translations exist. `GET /i18n/glossary` exposes it —
added for a real, testable consumer today (same reasoning as Phase 4's
`POST /calculation/preview`), though the primary intended consumer is
Phase 15's report generator importing `glossary.ts` directly as backend
code. Verified with 11 tests (full coverage of every Graha enum value and
every spec §26 term having non-empty ta/en, all 34 sections numbered 1-34
with unique slugs, spot-checks of exact spec §28 wording for the first,
a middle, and the last section) plus a live check of the running endpoint's
JSON against the master spec text line-by-line. **Also fixed while running
the growing e2e suite**: with `test/i18n.e2e-spec.ts` added, Jest's default
one-worker-per-CPU-core parallelism opened enough concurrent Prisma
connection pools against the local portable Postgres to make some suites'
`afterAll` hooks flake past the default 5000ms timeout — not a logic bug,
just too many DB connections opening at once. Fixed by capping
`maxWorkers: 4` and raising `testTimeout: 15000` in `backend/jest.config.js`;
confirmed stable across repeated full-suite runs afterward. 151/151 backend
tests pass.

**Phase 15 complete**: full report generator (`backend/src/reports/`) —
`GET /jathakams/:id/report?language=` assembles the fixed 34-section
structure (spec §28, `REPORT_SECTIONS` from Phase 14's glossary) into one
table of contents. It doesn't recompute or duplicate chart data: 11
sections (lagna_rasi through transit_results) are classified `chart_data`
since they're already fully served by existing endpoints; 7 sections map to
Phase 13's AI prediction sections and carry the cached `Prediction` text
once generated (`ai_pending` before, `ai_generated` after); the remaining
16 (business, family, children, favorable_*, remedies, life_timeline,
final_summary, etc.) are honestly marked `unavailable` — no engine or
prompt covers them yet — rather than silently omitted. Frontend:
`ReportStructurePanel.tsx` renders this as a live 34-row list on the `/new`
results screen. **Also added, at user request**: a "palan period" selector
(`backend/src/ai/palan-period.types.ts`) letting the user choose how far
ahead an AI prediction should reason before generating — CURRENT (default,
current dasha/bukti only, unchanged from Phase 13), NEXT_YEARS (a window
from today), WHOLE_LIFE (the full persisted dasha timeline), or UNTIL_DASHA
(truncated to a chosen future Mahadasha, optionally narrowed to one of its
Antardashas) — reusing Phase 9's already-computed dasha timeline (no new
astronomical calculation) and Phase 14's glossary for real graha names in
both the AI prompt and the frontend's dropdowns. Documented rather than
solved: `Prediction` stays keyed on `[jathakamId, section, language]` with
no schema change, so a non-CURRENT request always regenerates but
overwrites the same cached row — there's no separate stored variant per
period. Frontend: `PredictionPanel.tsx` gained a period selector wired to
the real dasha timeline (Mahadasha dropdown shows actual grahas and years
from this chart, e.g. "சுக்கிரன் (1990–2001)", with an optional Antardasha
narrowing dropdown). Verified with 34 new backend tests: 15 for the
timeline-filtering/truncation logic (hand-built fixture with boundary cases
hand-verified before writing assertions), 13 e2e tests extending the
Phase 13 fake-provider suite (non-CURRENT periods always regenerate and
carry `dashaTimeline`/the correct period wording in the prompt; CURRENT
behaves identically to omitting palanPeriod; invalid mode/year-range
requests 400), and 6 e2e tests for the report endpoint (all 34 sections
present and numbered correctly; chart/AI/unavailable classification
correct; ai_pending flips to ai_generated after calling the predictions
endpoint; language switching; 404/400 paths). 179/179 backend tests pass.
Verified live in the browser against the known reference chart: the report
panel correctly lists all 34 sections with live status, and the palan
period selector's Mahadasha dropdown showed the real Vimshottari sequence
for this chart (Venus 1990–2001 balance period, Sun 2001–2007, Moon
2007–2017, ...) with an Antardasha sub-dropdown in the correct classical
order: the generate request reached the backend with the palan period
payload intact (confirmed via network inspection — 503 missing-API-key, not
a 400 validation error).

**Phase 16 complete**: PDF generation (`backend/src/reports/pdf/`, spec
§40). `POST /jathakams/:id/report/pdf?language=` renders the full
34-section report to a real PDF via headless Chromium and
`GET .../report/pdf` downloads it. Uses `puppeteer-core` — deliberately not
`puppeteer`, to avoid its ~300MB bundled Chromium download in this
no-admin/portable-tooling environment — driving whatever Chromium-based
browser is already installed (auto-detected Edge/Chrome/Chromium, or
`PUPPETEER_EXECUTABLE_PATH` if set), the same "no heavy installs, use
what's on the machine" stance as the portable Postgres and Moshier-mode
ephemeris. **Caught during setup**: `puppeteer-core@25.x` turned out to
ship ESM-only, which crashes on `require()` from this CommonJS backend —
caught by a straightforward `npm install` + build before any code was
written against it, fixed by pinning `24.43.1` (the last version with a
real CJS build). The report's Tamil text is rendered with a genuinely
embedded Noto Sans Tamil font (`backend/assets/fonts/`, SIL OFL licensed,
base64-embedded as `@font-face` so it renders correctly regardless of the
host's installed fonts — spec §40's "must render Unicode Tamil correctly"
requirement), with a system-font fallback if that file is ever missing.
The Rasi/Navamsa chart grid is a direct server-side port of the frontend's
`SouthIndianChart.tsx` (same layout algorithm, now a plain string builder
with no React needed) so the PDF's chart looks identical to the web one.
Content-wise, the PDF reuses Phase 15's 34-section classification but,
unlike the JSON report endpoint, renders real content for every
`chart_data` section directly (tables, the SVG charts) since a PDF has no
follow-up API call to make; AI sections show whatever's already cached
(`ai_pending` sections get an honest "not yet generated" placeholder rather
than blocking PDF generation on live, costly AI calls). One PDF per
`(jathakam, language)` — regenerating overwrites both the file and its
`Report` row (added spec's first real use of that table: a migration gave
it a `[jathakamId, language]` unique constraint, applied manually since
`prisma migrate dev` refuses to run non-interactively — created the
migration SQL by hand following the existing migration's naming
convention, applied it with `prisma db execute`, then registered it with
`prisma migrate resolve --applied` so migration history stays clean).
Frontend: `PdfDownloadButton.tsx` — generate-then-download in two requests
so the browser's native download flow handles the file. Verified with 23
new backend tests (SVG builder: Lagna marking, graha abbreviations,
retrograde/combust styling, HTML-escaping; browser-executable resolution
using real temp files rather than mocking `fs.existsSync`, which isn't
spyable in this Node build; HTML template: all 34 headings present and
numbered, real chart/AI/placeholder content per section status, the
mandatory disclaimer, HTML-escaping of user-controlled profile data; a
genuine end-to-end e2e suite that actually launches the local browser,
generates a real PDF, and asserts on the `%PDF-` magic bytes and a
50KB+ file size, not a mock). 209/209 backend tests pass (registry-wide,
not just the new ones). Verified live in the browser against the known
reference chart both via the test suite and by hand: opened the generated
PDF and paged through it — cover page, all 34 section headings in Tamil,
real tables for planetary positions/houses/transits, the Rasi and Navamsa
SVG charts rendering identically to the web view, and yoga/dosha results
(Raja Yoga STRONG; Pitru Dosha + Grahana Dosha both STRONG from the same
Sun-Rahu conjunction in house 12) matching exactly what Phase 11/12 hand-
verified for this same reference chart months earlier in this project.

**Phase 17 complete**: authentication + user profiles (`backend/src/auth/`,
spec §41). Real email/password accounts finally replace the dev-user
stand-in every profile/jathakam service used since Phase 3
(`profiles.service.ts`'s `getOrCreateDevUser()`, deleted this phase exactly
as its own comment predicted it would be). Hand-rolled JWT auth — no
Passport.js, matching the project's "raw fetch over SDK" precedent
(`AnthropicProvider`) — via `POST /auth/register`, `POST /auth/login`,
`GET /auth/me`, and `DELETE /auth/me` (spec §41 "User deletion", cascading
through every table the account owns via `schema.prisma`'s existing
`onDelete: Cascade` chain, satisfying "Report deletion" in the same
operation). Every jathakam-scoped controller (Jathakam, Dasha, Transits,
Interpretation, Report, Pdf) now requires a valid bearer token *and*
verifies the resource belongs to the requesting user — 404ing, never
403ing, so a request never even confirms another user's data exists (spec
§41: "do not expose one user's birth data to another user"). Ownership
checks are a small shared `assertJathakamOwnership`/`assertProfileOwnership`
pair (`auth/ownership.util.ts`) used either via a reusable
`JathakamOwnershipGuard` (for controllers whose routes consistently key off
`:id` as a jathakamId) or inline (for `JathakamController`/
`ProfilesController`, whose routes mix jathakamId/profileId/body shapes).
**Two real ESM-only-package bugs caught during setup**, same failure mode
as Phase 16's puppeteer-core: `@nestjs/jwt@12.x` and its `jsonwebtoken`
dependency ship ESM-only and crash on `require()` from this CommonJS
backend — caught immediately via a build/test run before writing dependent
code, fixed by pinning `@nestjs/jwt@11.0.2` (the last version with a real
CJS build, still compatible with this project's `@nestjs/common@10.x`).
Frontend: a new `/login` page (register/login tabs, bilingual), token
storage in `localStorage` (`frontend/src/lib/auth.ts`), an `authFetch`
wrapper in `api.ts` that every protected call now goes through, and
route-level redirects — `/` and `/new` both bounce to `/login` when no
session exists. The PDF download link (`window.open()`, which can't attach
a custom header) carries the token as a `?token=` query param instead — the
backend's `JwtAuthGuard` accepts either, a documented tradeoff (a token in
a URL can leak via logs/browser history) acceptable for this project's
current security bar. Verified with 20 new backend tests (a dedicated
`auth.e2e-spec.ts` covering register/login/duplicate-email/wrong-password/
`/me`/account-deletion-cascades-to-profiles) plus a cross-user isolation
test added to *every* existing jathakam-scoped e2e suite (profiles,
jathakam, dasha, transits, predictions, report, pdf) — each confirms a
second registered user gets a clean 404 for the first user's data, not a
403 or a leak. 222/226 backend tests pass; the 4 failures are the PDF
real-generation tests from Phase 16, now blocked by a headless-Edge/
puppeteer-core launch failure that appeared partway through this session
(`Failed to launch the browser process: Code: 0`, empty stderr) —
investigated at length (cleared ~90 leaked Edge processes, tried longer
timeouts, disabled pipe-mode, fresh profile dirs, `--no-sandbox`) without
finding the root cause; unrelated to this phase's auth changes, since the
PDF endpoints' *authorization* logic (401/404 paths, which never reach the
browser-launch step) all pass. Documented in `backend/src/auth/README.md`'s
"Known limitations": no token revocation (a deleted account's token stays
cryptographically valid until natural expiry), no password reset/email
verification, no login rate limiting — judged out of scope for this phase.
Verified live end-to-end in the browser: registered a new account, was
redirected through the full wizard, created a jathakam against the known
reference chart with every network request correctly carrying the bearer
token (confirmed via network inspection — all 200/201s), logged out, and
confirmed both `/` and `/new` immediately redirect to `/login` with no
session.

**Phase 18 complete**: admin panel (`backend/src/admin/`, spec §35).
Every route requires `JwtAuthGuard` + a new `AdminGuard`. **A real
security bug caught and fixed during this phase**: the guard's first draft
trusted the `role` claim embedded in the JWT at sign-in time — meaning a
freshly-promoted admin couldn't act until re-login, and worse, a *demoted*
admin would keep admin access for the rest of their token's lifetime (up
to 7 days). Fixed by having `AdminGuard` re-read the current role from the
database on every request instead. Verified live: demoted a test admin via
direct DB update and confirmed their very next request 403'd with no
re-login involved. Covers spec §35's 13 capabilities, honestly split
between what's genuinely database-backed and what's read-only because the
underlying thing (yoga/dosha rules, prompts, the `Language` enum, which AI
provider is active) is code or a file on disk, not a row an endpoint could
sensibly edit without a larger redesign — see `admin/README.md`'s mapping
table for exactly which is which. New real capabilities: **Manage users**
(list/view/promote/demote/delete, cascading through spec §41's existing
delete chain); **Manage API keys** (`ApiKeyConfig` table, AES-256-GCM
encrypted at rest, `AnthropicProvider` now checks it before falling back to
the env var — verified with a fetch-mock unit test that the DB-stored key
wins); **View generated reports** across all users; and **View calculation
logs / AI usage / token usage / errors** as one unified, queryable
`UsageLog` table (`backend/src/logging/`) rather than four separate
bespoke features — written from `InterpretationService` (with real token
counts from the AI provider's response, previously computed in Phase 13
but never persisted anywhere), `PdfService`, and `JathakamController` at
their success/failure points, with every write swallowed on failure so
logging can never break the request it's observing. A third manual
migration (same `db execute` + `migrate resolve --applied` pattern as
Phases 16/17, since `prisma migrate dev` still refuses to run
non-interactively) added the `UsageLog` and `ApiKeyConfig` tables.
Frontend: a compact, utilitarian `/admin` dashboard (deliberately
English-only, unlike the bilingual public wizard — internal tooling) with
tabs for Users, Usage, Reports, API Keys, and the read-only Catalog; the
main dashboard shows an "Admin Panel" link only when the logged-in user's
role is `ADMIN`. Verified with 24 new backend tests (encryption round-trip
and short-secret masking, the guard's promote/demote/missing-user cases,
and a comprehensive e2e suite covering every endpoint's 401/403 boundary,
user CRUD never leaking `passwordHash`, usage logs capturing real token
counts, API keys never appearing in plaintext in any response, and all
five read-only catalog listings) plus live verification in the browser —
registered a real account, promoted it to admin directly in the database,
and confirmed all three interactive tabs render genuine accumulated data
from the whole project's test history (11 jathakams, 12 predictions, 333
input / 666 output tokens, 2 PDFs, 0 errors). 253/253 backend tests pass.

**Sign in with Google** (added after Phase 18, at user request): standard
OAuth 2.0 Authorization Code flow in `backend/src/auth/google-auth.service.ts`,
hand-rolled via `fetch` with no `google-auth-library` dependency — same
"raw fetch over SDK" reasoning as `AnthropicProvider`. `GET /auth/google`
redirects to Google's consent screen; the callback exchanges the code for
an ID token, verifies it via Google's own `tokeninfo` endpoint (checking
`aud` matches our client id and that the email is verified), then finds the
account by `googleId`, **links** to an existing local account sharing the
same Google-verified email, or creates a new passwordless one — before
issuing the same JWT the email/password path does and bouncing the browser
to a small `/auth/callback` frontend page that stores it. `User.passwordHash`
became nullable for passwordless accounts, and `login()` now treats "no
password set" identically to a wrong password so a Google-only account
can't be probed for existence. Documented tradeoffs in
`backend/src/auth/README.md`: `tokeninfo` verification is rate-limited and
should become local JWKS verification at production scale, and no CSRF
`state` parameter is round-tripped (the registered redirect URI is the
primary defense). Verified with 14 new tests (8 unit tests mocking Google's
two HTTP calls — success, token-exchange failure, missing id_token, an
`aud` minted for a *different* client, and an unverified email; plus 6 e2e
tests with a faked `GoogleAuthService` proving a new account is created on
first sign-in, the *same* account is reused on the second, an existing
password account is linked rather than duplicated and can still log in with
its original password, and every failure path redirects to `/login` with an
error). Verified live in the browser: the bilingual Google button renders
on `/login` and correctly reaches the backend, which returns a clean 503
naming the missing env vars (no real Google credentials are configured
here); the `/auth/callback` page was then exercised with a genuine
backend-issued token and correctly fetched the user, stored the session,
and landed on the dashboard — the exact round trip a real Google redirect
produces. 267/267 backend tests pass.

## Getting started

```bash
npm install

# start local Postgres (see "Local database" below for which option applies)
docker compose up -d

# apply the schema
npm run prisma:migrate --workspace backend

# backend (http://localhost:4000/health)
npm run dev:backend

# frontend (http://localhost:3000)
npm run dev:frontend
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env.local` before running. Never commit real API keys or secrets.

## Local database

Two supported ways to get Postgres running locally — pick whichever matches
your machine, `DATABASE_URL` in `backend/.env` works the same either way:

**Docker (preferred when available):**
```bash
docker compose up -d
```

**Portable Postgres, no Docker/admin rights needed** (what this dev
environment uses, since Docker Desktop needs WSL2 which requires an
admin-elevated install): a self-contained PostgreSQL 16 install lives in
`.devdb/` (gitignored, not committed — every machine sets up its own copy).

```bash
# start
.devdb/pgsql/bin/pg_ctl.exe -D .devdb/data -l .devdb/postgres.log -o "-p 5432" start

# stop
.devdb/pgsql/bin/pg_ctl.exe -D .devdb/data stop
```

If `.devdb/` doesn't exist yet on a fresh checkout: download the EDB
PostgreSQL 16 "binaries zip" for Windows, extract it to `.devdb/pgsql`, then
`.devdb/pgsql/bin/initdb.exe -D .devdb/data -U jathakam --pwfile=<file with the DB password>`,
followed by the start command above and `createdb.exe -h localhost -U jathakam jathakam`.

## Repo layout

```
backend/    NestJS API + calculation/dasha/rule/AI engines
frontend/   Next.js web app
docs/       Architecture reference
```
