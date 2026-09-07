import { AiProviderRegistry } from './ai-provider.registry';
import { AnthropicProvider } from './anthropic.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { OllamaProvider } from './ollama.provider';
import { FallbackAiProvider } from './fallback.provider';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

const noDbKey = { getDecrypted: async () => null } as unknown as AdminApiKeysService;

describe('AiProviderRegistry', () => {
  const originalDefault = process.env.AI_DEFAULT_PROVIDER;
  const originalFallback = process.env.AI_FALLBACK_PROVIDERS;
  let anthropic: AnthropicProvider;
  let deepseek: DeepSeekProvider;
  let ollama: OllamaProvider;
  let registry: AiProviderRegistry;

  beforeEach(() => {
    anthropic = new AnthropicProvider(noDbKey);
    deepseek = new DeepSeekProvider(noDbKey);
    ollama = new OllamaProvider(noDbKey);
    registry = new AiProviderRegistry(anthropic, deepseek, ollama);
  });

  afterEach(() => {
    if (originalDefault === undefined) delete process.env.AI_DEFAULT_PROVIDER;
    else process.env.AI_DEFAULT_PROVIDER = originalDefault;
    if (originalFallback === undefined) delete process.env.AI_FALLBACK_PROVIDERS;
    else process.env.AI_FALLBACK_PROVIDERS = originalFallback;
  });

  describe('with fallback disabled (AI_FALLBACK_PROVIDERS="")', () => {
    beforeEach(() => {
      process.env.AI_FALLBACK_PROVIDERS = '';
    });

    it('returns the AnthropicProvider instance directly when explicitly requested', () => {
      expect(registry.getProvider('ANTHROPIC')).toBe(anthropic);
    });

    it('returns the DeepSeekProvider instance directly when explicitly requested', () => {
      expect(registry.getProvider('DEEPSEEK')).toBe(deepseek);
    });

    it('returns the OllamaProvider instance directly when explicitly requested', () => {
      expect(registry.getProvider('OLLAMA')).toBe(ollama);
    });

    it.each(['OPENAI', 'GEMINI', 'NVIDIA_NIM'] as const)(
      'returns an unimplemented provider carrying id %s',
      (id) => {
        const provider = registry.getProvider(id);
        expect(provider.id).toBe(id);
        expect(provider).not.toBe(anthropic);
      },
    );

    it('defaults to Anthropic when no id and no env var are given (built-in fallback, not AI_FALLBACK_PROVIDERS)', () => {
      delete process.env.AI_DEFAULT_PROVIDER;
      expect(registry.getProvider()).toBe(anthropic);
    });

    it('honors AI_DEFAULT_PROVIDER (case-insensitive) when no explicit id is given', () => {
      process.env.AI_DEFAULT_PROVIDER = 'deepseek';
      expect(registry.getProvider()).toBe(deepseek);
    });

    it('falls back to Anthropic for an unrecognized AI_DEFAULT_PROVIDER value', () => {
      process.env.AI_DEFAULT_PROVIDER = 'not_a_real_provider';
      expect(registry.getProvider()).toBe(anthropic);
    });
  });

  describe('fallback chaining (the DeepSeek -> Anthropic -> Ollama setup)', () => {
    it('wraps the primary and its configured fallbacks in a FallbackAiProvider by default', () => {
      process.env.AI_DEFAULT_PROVIDER = 'deepseek';
      delete process.env.AI_FALLBACK_PROVIDERS; // -> default chain: ANTHROPIC, OLLAMA

      const provider = registry.getProvider();

      expect(provider).toBeInstanceOf(FallbackAiProvider);
      expect(provider.id).toBe('DEEPSEEK'); // reports the PRIMARY's id
    });

    it('actually falls through DEEPSEEK -> ANTHROPIC -> OLLAMA in that order when each fails', async () => {
      process.env.AI_DEFAULT_PROVIDER = 'deepseek';
      delete process.env.AI_FALLBACK_PROVIDERS;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      // DeepSeek and Anthropic both reject for lack of a configured key
      // (noDbKey never resolves one); Ollama succeeds because it needs no
      // key at all — only a reachable server, which we fake via fetch.
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'llama3.1', message: { content: 'from ollama' } }),
      } as Response);

      const result = await registry.getProvider().generate({ systemPrompt: 'sys', userPrompt: 'user' });

      expect(result.providerId).toBe('OLLAMA');
      expect(result.text).toBe('from ollama');
      fetchSpy.mockRestore();
    });

    it('honors a custom AI_FALLBACK_PROVIDERS list and order', () => {
      process.env.AI_DEFAULT_PROVIDER = 'deepseek';
      process.env.AI_FALLBACK_PROVIDERS = 'OLLAMA'; // Anthropic deliberately excluded

      const provider = registry.getProvider() as FallbackAiProvider;
      expect(provider).toBeInstanceOf(FallbackAiProvider);
      const chainIds = provider['chain'].map((p: { id: string }) => p.id);
      expect(chainIds).toEqual(['DEEPSEEK', 'OLLAMA']);
    });

    it('never lists the primary a second time as its own fallback', () => {
      process.env.AI_DEFAULT_PROVIDER = 'anthropic';
      process.env.AI_FALLBACK_PROVIDERS = 'ANTHROPIC,OLLAMA';

      const provider = registry.getProvider() as FallbackAiProvider;
      const chainIds = provider['chain'].map((p: { id: string }) => p.id);
      expect(chainIds).toEqual(['ANTHROPIC', 'OLLAMA']);
    });

    it('drops unrecognized entries from AI_FALLBACK_PROVIDERS rather than crashing', () => {
      process.env.AI_DEFAULT_PROVIDER = 'deepseek';
      process.env.AI_FALLBACK_PROVIDERS = 'not_real,OLLAMA';

      const provider = registry.getProvider() as FallbackAiProvider;
      const chainIds = provider['chain'].map((p: { id: string }) => p.id);
      expect(chainIds).toEqual(['DEEPSEEK', 'OLLAMA']);
    });
  });
});
