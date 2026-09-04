# ai/ — AI Interpretation Engine (Phase 13)

Turns the already-computed, deterministic jathakam JSON (Phases 4-12) into
Tamil/English narrative prose. This layer never calculates or invents
astronomy or astrology — it only explains what the engine already produced.
See docs/ARCHITECTURE.md § AI Architecture for the full pipeline and
authority hierarchy, and `backend/src/ai/providers/README.md` for the
provider abstraction.

## Flow

1. `InterpretationService.generate(jathakamId, section, language, regenerate?)`
   checks `Prediction` (unique on `[jathakamId, section, language]`) and
   returns the cached row unless `regenerate` is true — AI calls cost real
   time and money, so nothing regenerates silently.
2. Assembles a trimmed context JSON: profile (name/gender/DOB/TOB/time
   accuracy), lagna, rasi, planets (minus the synthetic LAGNA pseudo-planet),
   houseAnalysis, navamsa, yogas, doshas, and the current
   Maha/Antar/Pratyantar dasha.
3. `PromptLoaderService` loads `backend/prompts/system.md` (the 14
   non-negotiable rules from spec §25 — never alter positions, never invent,
   calibrated language, medical/financial/past-life disclaimers, the
   mandatory closing disclaimer) plus the section-specific task prompt from
   `backend/prompts/{tamil,english}/<section>.md`. Files are cached in memory
   after the first read.
4. `AiProviderRegistry.getProvider()` selects the active `AIProvider` (an
   explicit id, or `AI_DEFAULT_PROVIDER` env var, defaulting to Anthropic).
   Only `AnthropicProvider` is a real implementation; OpenAI/Gemini/NVIDIA
   NIM/Ollama are named (spec §32) but return `NotImplementedException` via
   `unimplementedProvider()` until built.
5. The provider's response is persisted via `prisma.prediction.upsert()`,
   tagged with a confidence level (`confidenceFromTimeAccuracy` —
   documented simplification: only birth-time accuracy feeds this today, not
   the fuller multi-factor scoring spec §30 describes), the provider id,
   model name, and prompt version (`ASTROLOGY_PROMPT_VERSION` env var,
   default `1.0`).

## The 7 initial sections

`prediction.types.ts` defines `PREDICTION_SECTIONS`: `basic_reading`,
`health`, `wealth`, `career`, `marriage`, `karma`, `future` — the initial
working set proving the pipeline end-to-end. Phase 15 (full report
generator) will assemble the complete 34-section report from spec §33.

## Retrieval

No vector-based retrieval (RAG) — see `backend/src/rag/README.md` for why
this was deferred and what grounds the model instead.

## What's not covered by tests

`AnthropicProvider`'s success path (a real network call to
`api.anthropic.com`) is not covered by automated tests — only the
missing-key failure path is. End-to-end verification with a live
`ANTHROPIC_API_KEY` in `backend/.env` is a manual step; the fake-provider
e2e suite (`test/predictions.e2e-spec.ts`) covers the rest of the pipeline
(context assembly, caching, `regenerate`, listing, 404/400s) without
depending on real API access.
