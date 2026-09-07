# ai/providers/ — AI Provider Abstraction (Phase 13, extended)

```ts
interface AIProvider {
  readonly id: AIProviderId; // 'ANTHROPIC' | 'OPENAI' | 'GEMINI' | 'NVIDIA_NIM' | 'OLLAMA' | 'DEEPSEEK'
  generate(input: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<{
    text: string;
    model: string;
    usage?: { inputTokens: number; outputTokens: number };
    providerId?: AIProviderId; // set only by FallbackAiProvider — see below
  }>;
}
```

Concrete providers each read their own API key from environment variables
(or the admin-managed encrypted store — see below) — never hard-coded. The
active provider + fallback chain is chosen via `AI_DEFAULT_PROVIDER` /
`AI_FALLBACK_PROVIDERS` env vars, resolved by `AiProviderRegistry`.

The provider layer NEVER receives raw birth details or is asked to calculate
astronomy. It only ever receives the already-computed jathakam JSON plus a
prompt template (see `backend/prompts/`) and returns Tamil/English prose.

## What's actually implemented

- **`anthropic.provider.ts`** — Anthropic Messages API. First implementation
  (Phase 13).
- **`deepseek.provider.ts`** — DeepSeek's OpenAI-compatible chat completions
  API (`POST https://api.deepseek.com/chat/completions`, Bearer auth). Same
  key-lookup order as Anthropic: admin-managed encrypted key first, then
  `DEEPSEEK_API_KEY`.
- **`ollama.provider.ts`** — a local (or self-hosted) Ollama server. No API
  key — reachability of `OLLAMA_BASE_URL` is the only availability check. The
  model named by `OLLAMA_MODEL` must already be pulled there
  (`ollama pull llama3.1`) or Ollama 404s rather than fetching it. In a
  typical single-service production deploy (e.g. this project's Render
  backend) there's no Ollama instance next to the API, so this provider
  simply fails closed there — a normal fallback-chain miss, not a bug,
  unless you separately host one and point `OLLAMA_BASE_URL` at it.
- **`unimplemented.provider.ts`** — still the placeholder for `OPENAI`,
  `GEMINI`, and `NVIDIA_NIM`. Exists so the registry can name every provider
  the settings UI will eventually offer without silently defaulting to the
  wrong one; throws `NotImplementedException` if selected.

## Fallback chaining

`AiProviderRegistry.getProvider()` doesn't return a single provider in
isolation — it builds an ordered chain (primary + configured fallbacks) and,
when that chain has more than one entry, wraps it in a **`FallbackAiProvider`**
(`fallback.provider.ts`). That wrapper tries each provider in order and falls
through to the next on ANY failure — a missing key, an unreachable host, a
non-2xx response from the vendor — so one provider being down doesn't fail
the whole interpretation request.

```
AI_DEFAULT_PROVIDER=deepseek        # primary
AI_FALLBACK_PROVIDERS=ANTHROPIC,OLLAMA   # tried in order if DeepSeek fails
```

Default when `AI_FALLBACK_PROVIDERS` is unset: `ANTHROPIC,OLLAMA`. Set it to
an empty string to disable fallback entirely and get the primary's raw
provider instance back. Unrecognized entries in the list are dropped
silently rather than crashing boot — a typo degrades to "no fallback for
that entry," not a startup failure.

**Reporting which provider actually served the request** is the one place
this needed a real interface change: `AIGenerateOutput` gained an optional
`providerId` field, set only by `FallbackAiProvider` when a fallback (not
the primary) ends up serving the response. `InterpretationService` uses
`result.providerId ?? provider.id` when logging usage and writing
`Prediction.aiProvider` — so if DeepSeek is down and Anthropic quietly picks
up the request, the database and usage log correctly say `ANTHROPIC`, not
`DEEPSEEK`. A plain (non-chained) provider never sets `providerId`, so this
degrades to the pre-fallback behavior automatically.

## Admin-managed keys

`AdminApiKeysService` (`backend/src/admin/`) stores provider API keys
encrypted at rest (AES-256-GCM) and is the first place every real provider
checks before falling back to its env var — including `OllamaProvider`,
which sends it as a Bearer token if one is configured, but never requires
one (a plain local Ollama server needs no auth at all; only some hosted
Ollama-compatible endpoints do).
