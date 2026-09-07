import { ServiceUnavailableException } from '@nestjs/common';
import { DeepSeekProvider } from './deepseek.provider';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

// No admin-managed key configured for any of these tests — every case
// falls through to the DEEPSEEK_API_KEY env var, mirroring AnthropicProvider.
const noDbKey = { getDecrypted: async () => null } as unknown as AdminApiKeysService;

describe('DeepSeekProvider', () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it('has id DEEPSEEK', () => {
    expect(new DeepSeekProvider(noDbKey).id).toBe('DEEPSEEK');
  });

  it('throws ServiceUnavailableException when no admin-managed key and no DEEPSEEK_API_KEY env var are set', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const provider = new DeepSeekProvider(noDbKey);
    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('prefers an admin-managed key over the env var', async () => {
    process.env.DEEPSEEK_API_KEY = 'env-key-should-not-be-used';
    const dbKey = { getDecrypted: async () => 'db-key-should-be-used' } as unknown as AdminApiKeysService;
    const provider = new DeepSeekProvider(dbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'deepseek-chat', choices: [{ message: { content: 'ok' } }] }),
    } as Response);

    await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer db-key-should-be-used' }) }),
    );
    fetchSpy.mockRestore();
  });

  it('parses the OpenAI-compatible chat completions response shape', async () => {
    process.env.DEEPSEEK_API_KEY = 'a-key';
    const provider = new DeepSeekProvider(noDbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'deepseek-chat',
        choices: [{ message: { content: 'இது ஒரு பரிசோதனை' } }],
        usage: { prompt_tokens: 12, completion_tokens: 34 },
      }),
    } as Response);

    const result = await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(result).toEqual({
      text: 'இது ஒரு பரிசோதனை',
      model: 'deepseek-chat',
      usage: { inputTokens: 12, outputTokens: 34 },
    });
    fetchSpy.mockRestore();
  });

  it('throws InternalServerErrorException on a non-2xx response', async () => {
    process.env.DEEPSEEK_API_KEY = 'a-key';
    const provider = new DeepSeekProvider(noDbKey);

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid key' } as Response);

    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(/401/);
    fetchSpy.mockRestore();
  });

  it('throws ServiceUnavailableException when the network call itself fails', async () => {
    process.env.DEEPSEEK_API_KEY = 'a-key';
    const provider = new DeepSeekProvider(noDbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    fetchSpy.mockRestore();
  });
});
