import { ServiceUnavailableException } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { FallbackAiProvider } from './fallback.provider';
import { AIGenerateInput, AIGenerateOutput, AIProvider } from './ai-provider.interface';

function fakeProvider(id: AIProviderId, behavior: () => Promise<AIGenerateOutput>): AIProvider {
  return { id, generate: (_input: AIGenerateInput) => behavior() };
}

const input: AIGenerateInput = { systemPrompt: 'sys', userPrompt: 'user' };

describe('FallbackAiProvider', () => {
  it('refuses to construct with an empty chain', () => {
    expect(() => new FallbackAiProvider([])).toThrow();
  });

  it('reports the PRIMARY provider id, not whichever ends up serving', () => {
    const primary = fakeProvider('DEEPSEEK', async () => ({ text: 'ok', model: 'm' }));
    const fallback = fakeProvider('ANTHROPIC', async () => ({ text: 'ok', model: 'm' }));
    expect(new FallbackAiProvider([primary, fallback]).id).toBe('DEEPSEEK');
  });

  it('uses the primary directly when it succeeds, without touching the fallbacks', async () => {
    const primaryGenerate = jest.fn().mockResolvedValue({ text: 'from primary', model: 'primary-model' });
    const fallbackGenerate = jest.fn();
    const chain = new FallbackAiProvider([
      { id: 'DEEPSEEK', generate: primaryGenerate },
      { id: 'ANTHROPIC', generate: fallbackGenerate },
    ]);

    const result = await chain.generate(input);

    expect(result).toEqual({ text: 'from primary', model: 'primary-model', providerId: 'DEEPSEEK' });
    expect(fallbackGenerate).not.toHaveBeenCalled();
  });

  it('falls through to the next provider when the primary fails, and reports who actually served it', async () => {
    const deepseek = fakeProvider('DEEPSEEK', async () => {
      throw new Error('no DEEPSEEK API key configured');
    });
    const anthropic = fakeProvider('ANTHROPIC', async () => ({ text: 'from anthropic', model: 'claude-sonnet-5' }));
    const ollama = fakeProvider('OLLAMA', async () => ({ text: 'should not be reached', model: 'llama3.1' }));

    const chain = new FallbackAiProvider([deepseek, anthropic, ollama]);
    const result = await chain.generate(input);

    expect(result.providerId).toBe('ANTHROPIC');
    expect(result.text).toBe('from anthropic');
  });

  it('falls all the way through a two-failure chain to the last provider', async () => {
    const deepseek = fakeProvider('DEEPSEEK', async () => {
      throw new Error('deepseek down');
    });
    const anthropic = fakeProvider('ANTHROPIC', async () => {
      throw new Error('anthropic down');
    });
    const ollama = fakeProvider('OLLAMA', async () => ({ text: 'from ollama', model: 'llama3.1' }));

    const chain = new FallbackAiProvider([deepseek, anthropic, ollama]);
    const result = await chain.generate(input);

    expect(result.providerId).toBe('OLLAMA');
    expect(result.text).toBe('from ollama');
  });

  it('throws ServiceUnavailableException naming every failure when the whole chain fails', async () => {
    const deepseek = fakeProvider('DEEPSEEK', async () => {
      throw new Error('deepseek: no key');
    });
    const anthropic = fakeProvider('ANTHROPIC', async () => {
      throw new Error('anthropic: no key');
    });
    const ollama = fakeProvider('OLLAMA', async () => {
      throw new Error('ollama: unreachable');
    });

    const chain = new FallbackAiProvider([deepseek, anthropic, ollama]);

    await expect(chain.generate(input)).rejects.toThrow(ServiceUnavailableException);
    await expect(chain.generate(input)).rejects.toThrow(/deepseek: no key/);
    await expect(chain.generate(input)).rejects.toThrow(/anthropic: no key/);
    await expect(chain.generate(input)).rejects.toThrow(/ollama: unreachable/);
  });

  it('tries providers strictly in order (never calls a later one before an earlier one fails)', async () => {
    const callOrder: AIProviderId[] = [];
    const deepseek = fakeProvider('DEEPSEEK', async () => {
      callOrder.push('DEEPSEEK');
      throw new Error('fail');
    });
    const anthropic = fakeProvider('ANTHROPIC', async () => {
      callOrder.push('ANTHROPIC');
      return { text: 'ok', model: 'm' };
    });
    const ollama = fakeProvider('OLLAMA', async () => {
      callOrder.push('OLLAMA');
      return { text: 'ok', model: 'm' };
    });

    await new FallbackAiProvider([deepseek, anthropic, ollama]).generate(input);

    expect(callOrder).toEqual(['DEEPSEEK', 'ANTHROPIC']);
  });
});
