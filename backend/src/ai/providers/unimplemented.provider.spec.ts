import { NotImplementedException } from '@nestjs/common';
import { unimplementedProvider } from './unimplemented.provider';

describe('unimplementedProvider', () => {
  it('carries the given id', () => {
    expect(unimplementedProvider('OPENAI').id).toBe('OPENAI');
  });

  it('rejects with NotImplementedException naming the provider id', async () => {
    const provider = unimplementedProvider('GEMINI');
    await expect(provider.generate({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      NotImplementedException,
    );
    await expect(provider.generate({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(/GEMINI/);
  });
});
