import { ServiceUnavailableException } from '@nestjs/common';
import { AnthropicProvider } from './anthropic.provider';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

// No admin-managed key configured for any of these tests — every case
// falls through to the ANTHROPIC_API_KEY env var, same as before Phase 18.
const noDbKey = { getDecrypted: async () => null } as unknown as AdminApiKeysService;

describe('AnthropicProvider', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('has id ANTHROPIC', () => {
    expect(new AnthropicProvider(noDbKey).id).toBe('ANTHROPIC');
  });

  it('throws ServiceUnavailableException when no admin-managed key and no ANTHROPIC_API_KEY env var are set', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const provider = new AnthropicProvider(noDbKey);
    await expect(provider.generate({ systemPrompt: 'sys', userPrompt: 'user' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('prefers an admin-managed key over the env var', async () => {
    process.env.ANTHROPIC_API_KEY = 'env-key-should-not-be-used';
    const dbKey = { getDecrypted: async () => 'db-key-should-be-used' } as unknown as AdminApiKeysService;
    const provider = new AnthropicProvider(dbKey);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ model: 'fake-model', content: [{ type: 'text', text: 'ok' }] }),
    } as Response);

    await provider.generate({ systemPrompt: 'sys', userPrompt: 'user' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': 'db-key-should-be-used' }) }),
    );
    fetchSpy.mockRestore();
  });
});
