import { ServiceUnavailableException } from '@nestjs/common';
import { decryptSecret, encryptSecret, maskSecret } from './crypto.util';

describe('crypto.util', () => {
  const originalSecret = process.env.API_KEY_ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-secret-for-crypto-util-spec';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.API_KEY_ENCRYPTION_SECRET;
    else process.env.API_KEY_ENCRYPTION_SECRET = originalSecret;
  });

  it('round-trips a plaintext value through encrypt/decrypt', () => {
    const plaintext = 'sk-ant-super-secret-key-12345';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV) for the same plaintext', () => {
    const a = encryptSecret('same-value');
    const b = encryptSecret('same-value');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same-value');
    expect(decryptSecret(b)).toBe('same-value');
  });

  it('throws ServiceUnavailableException when API_KEY_ENCRYPTION_SECRET is not set', () => {
    delete process.env.API_KEY_ENCRYPTION_SECRET;
    expect(() => encryptSecret('anything')).toThrow(ServiceUnavailableException);
  });

  it('masks a long secret, keeping only a few characters at each end', () => {
    const masked = maskSecret('sk-ant-abcdefghijklmnop-9999');
    expect(masked.startsWith('sk-a')).toBe(true);
    expect(masked.endsWith('9999')).toBe(true);
    expect(masked).not.toContain('abcdefghijklmnop');
  });

  it('fully masks a short secret rather than exposing it', () => {
    expect(maskSecret('short')).toBe('••••••••');
  });
});
