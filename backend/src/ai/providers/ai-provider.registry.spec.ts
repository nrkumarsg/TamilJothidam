import { AiProviderRegistry } from './ai-provider.registry';
import { AnthropicProvider } from './anthropic.provider';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

const noDbKey = { getDecrypted: async () => null } as unknown as AdminApiKeysService;

describe('AiProviderRegistry', () => {
  const originalDefault = process.env.AI_DEFAULT_PROVIDER;
  let anthropic: AnthropicProvider;
  let registry: AiProviderRegistry;

  beforeEach(() => {
    anthropic = new AnthropicProvider(noDbKey);
    registry = new AiProviderRegistry(anthropic);
  });

  afterEach(() => {
    if (originalDefault === undefined) delete process.env.AI_DEFAULT_PROVIDER;
    else process.env.AI_DEFAULT_PROVIDER = originalDefault;
  });

  it('returns the AnthropicProvider instance when explicitly requested', () => {
    expect(registry.getProvider('ANTHROPIC')).toBe(anthropic);
  });

  it.each(['OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA'] as const)(
    'returns an unimplemented provider carrying id %s',
    (id) => {
      const provider = registry.getProvider(id);
      expect(provider.id).toBe(id);
      expect(provider).not.toBe(anthropic);
    },
  );

  it('defaults to Anthropic when no id and no env var are given', () => {
    delete process.env.AI_DEFAULT_PROVIDER;
    expect(registry.getProvider()).toBe(anthropic);
  });

  it('honors AI_DEFAULT_PROVIDER (case-insensitive) when no explicit id is given', () => {
    process.env.AI_DEFAULT_PROVIDER = 'openai';
    expect(registry.getProvider().id).toBe('OPENAI');
  });

  it('falls back to Anthropic for an unrecognized AI_DEFAULT_PROVIDER value', () => {
    process.env.AI_DEFAULT_PROVIDER = 'not_a_real_provider';
    expect(registry.getProvider()).toBe(anthropic);
  });
});
