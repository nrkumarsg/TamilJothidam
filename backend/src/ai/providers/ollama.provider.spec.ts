import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { OllamaProvider } from './ollama.provider';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

// No admin-managed key configured for most of these tests — Ollama must
// work with none at all, unlike every other provider.
const noDbKey = { getDecrypted: async () => null } as unknown as AdminApiKeysService;

describe('OllamaProvider', () => {
  const originalBaseUrl = process.env.OLLAMA_BASE_URL;
  const originalModel = process.env.OLLAMA_MODEL;

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = originalBaseUrl;
    if (originalModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = originalModel;
  });

  it('has id OLLAMA', () => {
    expect(new OllamaProvider(noDbKey).id).toBe('OLLAMA');
  });

  it('needs no API key — posts straight to OLLAMA_BASE_URL with no authorization header', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    const provider = new OllamaProvider(noDbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'llama3.1', message: { content: 'ok' } }),
    } as Response);

    await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({ headers: expect.not.objectContaining({ authorization: expect.anything() }) }),
    );
    fetchSpy.mockRestore();
  });

  it('sends an admin-managed key as a Bearer token when one is configured', async () => {
    const dbKey = { getDecrypted: async () => 'hosted-ollama-token' } as unknown as AdminApiKeysService;
    const provider = new OllamaProvider(dbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'llama3.1', message: { content: 'ok' } }),
    } as Response);

    await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer hosted-ollama-token' }) }),
    );
    fetchSpy.mockRestore();
  });

  it('trims a trailing slash on OLLAMA_BASE_URL before appending the path', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434/';
    const provider = new OllamaProvider(noDbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'llama3.1', message: { content: 'ok' } }),
    } as Response);

    await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:11434/api/chat', expect.any(Object));
    fetchSpy.mockRestore();
  });

  it('parses the chat response, mapping prompt_eval_count/eval_count to input/output tokens', async () => {
    const provider = new OllamaProvider(noDbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'llama3.1',
        message: { content: 'பதில்' },
        prompt_eval_count: 20,
        eval_count: 40,
      }),
    } as Response);

    const result = await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(result).toEqual({
      text: 'பதில்',
      model: 'llama3.1',
      usage: { inputTokens: 20, outputTokens: 40 },
    });
    fetchSpy.mockRestore();
  });

  it('throws ServiceUnavailableException when the server is unreachable', async () => {
    const provider = new OllamaProvider(noDbKey);
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    fetchSpy.mockRestore();
  });

  it('throws InternalServerErrorException when the model has not been pulled (404)', async () => {
    const provider = new OllamaProvider(noDbKey);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, text: async () => 'model not found' } as Response);

    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(
      InternalServerErrorException,
    );
    fetchSpy.mockRestore();
  });
});
