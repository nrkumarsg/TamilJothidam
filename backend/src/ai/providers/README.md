# ai/providers/ — AI Provider Abstraction (Phase 13)

```ts
interface AIProvider {
  readonly id: string; // 'anthropic' | 'openai' | 'gemini' | 'nvidia-nim' | 'ollama'
  generate(input: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<{ text: string; model: string; usage?: { inputTokens: number; outputTokens: number } }>;
}
```

Concrete providers (`anthropic.provider.ts`, `openai.provider.ts`, etc.) each
read their own API key from environment variables — never hard-coded. The
active provider + model is chosen via admin settings (`calculation_settings`
table / admin panel, Phase 18), defaulting to Anthropic per project config.

The provider layer NEVER receives raw birth details or is asked to calculate
astronomy. It only ever receives the already-computed jathakam JSON plus a
prompt template (see `backend/prompts/`) and returns Tamil/English prose.
