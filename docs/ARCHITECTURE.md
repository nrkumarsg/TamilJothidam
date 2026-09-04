# Tamil Jathakam AI Platform — Architecture

## 1. Pipeline (non-negotiable order)

```
BIRTH DATA
  → LOCATION + TIMEZONE VALIDATION
  → ASTRONOMICAL EPHEMERIS (calculation/)
  → PLANETARY POSITIONS
  → LAGNA / RASI / NAKSHATRA
  → HOUSES (jathakam/)
  → DIVISIONAL CHARTS (jathakam/)
  → DASHA (dasha/)
  → TRANSITS (transits/)
  → YOGA / DOSHA RULE ENGINE (rules/)
  → STRUCTURED JATHAKAM JSON  ◄── source of truth, stored in DB
  → AI INTERPRETATION (ai/, rag/)
  → TAMIL/ENGLISH REPORT (reports/)
```

The AI layer only ever runs *after* the structured JSON exists, and only ever
reads it — it never computes astronomy and it never overwrites the JSON. This
is enforced structurally: `ai/` and `rag/` modules have no dependency on
`calculation/`, `jathakam/`, `dasha/`, or `transits/` — they only accept the
finished JSON as a function argument.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Node.js 24 + TypeScript + NestJS | Modular DI maps cleanly onto engine-per-module; chosen over Python/FastAPI because this machine has no Python install and Node was already present (decided with user 2026-09-03) |
| Astronomical engine | `sweph` npm bindings (Swiss Ephemeris), Moshier mode (`SEFLG_MOSEPH`) | Confirmed working on Windows with zero setup (Phase 4): ships prebuilt native binaries (no C++ toolchain needed) and Moshier mode needs no external ephemeris data files, at ~arcsecond precision — plenty given typical birth-time entry uncertainty |
| Database | PostgreSQL 16 (`pgvector/pgvector:pg16` image) | Relational schema + JSONB for full chart payloads + pgvector for RAG, one database, no extra infra |
| ORM | Prisma | Type-safe schema/migrations shared with NestJS |
| Frontend | Next.js 14 (App Router) + TypeScript | Web app, chosen for report/PDF/print-heavy UI (decided with user 2026-09-03) |
| PDF | Headless-Chromium HTML→PDF (Phase 16) with embedded Noto Sans Tamil | Correct Tamil Unicode rendering |
| AI | Provider-agnostic `AIProvider` interface; Anthropic Claude is the first working provider (decided with user 2026-09-03) | OpenAI/Gemini/NVIDIA NIM/Ollama added behind the same interface without changing callers |
| Auth | JWT (`@nestjs/jwt`) + argon2 password hashing | Phase 17 |

## 3. Monorepo layout

```
Tamil_Jothidam/
  backend/
    src/
      locations/        Phase 3 — place search + timezone/DST resolution
      profiles/          Phase 3 — birth profile intake (pre-auth: single dev user)
      calculation/     Phase 4 — ephemeris wrapper
      jathakam/         Phase 5-8 — rasi/nakshatra/lagna/houses/navamsa
      dasha/            Phase 9 — Vimshottari dasha
      transits/         Phase 10 — gochara
      rules/yoga/       Phase 11
      rules/dosha/      Phase 12
      ai/providers/     Phase 13 — AIProvider abstraction
      rag/              Phase 13 — knowledge base retrieval
      reports/          Phase 15-16 — report + PDF generation
      i18n/             Phase 14 — Tamil/English glossary
      users/            Phase 17 — auth (replaces profiles/'s dev-user stand-in)
      admin/            Phase 18 — admin panel API
      common/health/    Phase 1 — liveness check
      prisma/           Phase 2 — PrismaService/PrismaModule (global)
    prisma/             Phase 2 — schema.prisma + migrations
    prompts/{tamil,english}/   Phase 13-14 — versioned prompt templates
    knowledge/          Phase 13 — RAG source documents
    test/
  frontend/
    src/app/            Next.js App Router pages (input wizard, dashboard, report viewer)
    src/app/new/        Phase 3 — birth-data intake wizard (Steps 1-3), Phase 5 result screen
    src/lib/            Phase 3 — API client
    src/components/chart/   Phase 6 — SouthIndianChart (SVG D1 renderer, reusable for D9)
  docs/
    ARCHITECTURE.md      (this file)
  docker-compose.yml     local Postgres+pgvector
  .devdb/                gitignored — portable no-admin local Postgres (see README)
```

## 4. Database schema (Phase 2 will implement as `prisma/schema.prisma`)

| Table | Purpose | Key fields |
|---|---|---|
| `users` | Account + auth | id, email, password_hash, role, plan |
| `birth_profiles` | A named person's birth details | id, user_id, name, gender, dob, tob, time_accuracy |
| `birth_locations` | Resolved place of birth | id, profile_id, place_name, lat, lng, timezone, dst_info, manually_corrected |
| `jathakams` | One calculated chart run | id, profile_id, ayanamsa, julian_day, calculation_settings_id, created_at |
| `planets` | Per-graha computed data | jathakam_id, graha, longitude, sign, degree, nakshatra, pada, house, retrograde, combust, dignity |
| `houses` | Per-bhava computed data | jathakam_id, house_no, sign, lord, lord_house, occupants |
| `divisional_charts` | D9 etc. | jathakam_id, chart_type (D9, ...), data (JSONB) |
| `dashas` | Vimshottari periods | jathakam_id, level (maha/antar/pratyantar), planet, start_date, end_date, parent_id |
| `transits` | Computed gochara snapshots | jathakam_id, as_of_date, planet, sign, house, effect_tags |
| `yogas` | Detected yogas | jathakam_id, name, strength, participating_planets, participating_houses |
| `doshas` | Detected doshas | jathakam_id, name, severity, rule_triggered |
| `predictions` | AI-generated section text | jathakam_id, section, language, text, confidence, ai_provider, ai_model, prompt_version |
| `reports` | Generated report artifacts | id, jathakam_id, language, pdf_url/path, generated_at |
| `remedies` | Parihara recommendations | jathakam_id, category, text |
| `language_settings` | Per-user/report language choice | user_id, language |
| `calculation_settings` | Ayanamsa + engine config used for a run | id, ayanamsa, engine_version |

`jathakams.planets/houses/dashas/...` are normalized tables (not just one big
JSON blob) so the yoga/dosha rule engine and AI layer can query structured data
directly, while the full computed JSON is also cached (JSONB) on `jathakams`
to avoid recomputation on every report view.

## 5. AI architecture

```
AIProvider (interface)
  ├── AnthropicProvider   (first implementation)
  ├── OpenAIProvider
  ├── GeminiProvider
  ├── NvidiaNimProvider
  └── OllamaProvider
```

Selection: admin settings (DB-backed, editable via Phase 18 admin panel),
defaulting to `AI_DEFAULT_PROVIDER` env var. API keys are read from environment
variables only — never committed, never hard-coded.

**Authority hierarchy** (violating this is a bug, not a style choice):
1. `calculation/` output — absolute source of truth for astronomy.
2. `rules/yoga/`, `rules/dosha/` output — absolute source of truth for which
   yogas/doshas are present.
3. `knowledge/` (RAG) — source of truth for documented interpretation
   *rules*, retrieved to ground the AI's explanation, never to override 1 or 2.
4. AI provider — explanation/prose layer only. Receives the finished JSON +
   retrieved knowledge snippets + a prompt template; returns Tamil/English
   text. Must never be asked to compute or restate positions from scratch.

Prompts live in `backend/prompts/{tamil,english}/*.md`, loaded at runtime and
versioned via `ASTROLOGY_PROMPT_VERSION`. Each section prompt is required to:
separate calculated facts from interpretation, state confidence when birth
time accuracy is uncertain, avoid fear-based/medical/guaranteed-financial
language, and never present past-life statements as proven fact (see spec
§10, §25 for full rule list — enforced as static instructions in every
prompt template, not left to model judgment alone).

## 6. Tamil language architecture

Two distinct kinds of Tamil text, deliberately kept separate:

1. **Deterministic labels** — rasi/nakshatra/house names, fixed report section
   headings (the 34-section structure), UI strings. Hand-maintained in
   `i18n/glossary.ts`. Never AI-generated, so they're guaranteed correct
   regardless of what the LLM does. Default locale `ta`, `en` supported;
   architecture leaves room for `si`/`ml`/`hi`/`te`/`kn`/`ms` later.
2. **AI-generated prose** — interpretation paragraphs, produced per-section by
   the AI layer using the glossary's terminology (so output reads as
   professional Tamil astrology writing, not machine translation), with
   English technical terms only in parentheses where useful (e.g.
   "விம்சோத்தரி தசை (Vimshottari Dasha)").

This split is what makes §26 of the spec ("Tamil output must be natural,
professional Tamil, not literal machine translation") enforceable: the facts
the user relies on for accuracy come from code, not from the model's language
generation.

## 7. Content & safety guardrails (apply across all AI-generated sections)

- No fear-based dosha language; explain the traditional rule and its
  classical meaning instead of predicting doom.
- No medical diagnosis, no instruction to stop medication — always defer to
  a doctor for medical decisions.
- No guaranteed financial returns.
- Past-life/karma content is framed as traditional interpretation
  ("ஜோதிட பாரம்பரியத்தின் அடிப்படையில்...") never as proven fact.
- Every report carries the fixed disclaimer from spec §44.
- Missing birth time → lagna/house-based predictions are flagged as reduced
  accuracy, not silently treated as normal.

## 8. Phased implementation plan

1. Project architecture *(this document + scaffold — done)*
2. Database (Prisma schema + migrations)
3. Birth data intake + place/timezone resolution engine
4. Astronomical calculation engine
5. Rasi + Nakshatra + Lagna
6. South Indian chart renderer (frontend)
7. Navamsa (D9)
8. House (bhava) analysis
9. Vimshottari Dasha
10. Transit (gochara) engine
11. Yoga engine
12. Dosha engine
13. AI interpretation engine (+ RAG)
14. Tamil language system (glossary, section headings)
15. Full report generator (assembles all 34 sections)
16. PDF generation
17. Authentication + user profiles
18. Admin panel
19. Testing (regression suite against known reference charts)
20. Production deployment
21. Panchangam (daily almanac) — added 2026-09-03 at user request, kept last
    since it's independent of the birth-chart pipeline: date+location-based
    daily calculations (tithi, vaara, nakshatra, yoga, karana — the five
    classical "angas"), sunrise/sunset, and the inauspicious/auspicious
    time windows (Rahu Kalam, Yamagandam/Kuligai, Gulika Kalam, Nalla
    Neram, Durmuhurtham, Varjyam). Reuses the Phase 4 ephemeris engine
    (Sun/Moon longitudes, sunrise/sunset) but is otherwise a separate
    `panchangam/` module — no birth profile involved, just a date + place.

Each phase: implement → run tests → fix errors → explain what changed → list
files touched → get it stable before moving to the next phase (per user's
process requirement).
