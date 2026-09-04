import * as crypto from 'crypto';
import { ServiceUnavailableException } from '@nestjs/common';

// AES-256-GCM for admin-managed API keys at rest (spec §41 "Secure API key
// storage"). The encryption key is derived from API_KEY_ENCRYPTION_SECRET
// via SHA-256 so any length of secret works, matching the pattern of
// reading config directly from process.env used elsewhere in this project
// (e.g. AnthropicProvider) rather than a config service.
const IV_LENGTH = 12; // GCM standard nonce length

function encryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new ServiceUnavailableException(
      'API_KEY_ENCRYPTION_SECRET is not configured. Set it in backend/.env to enable admin-managed API keys.',
    );
  }
  return crypto.createHash('sha256').update(secret).digest();
}

// Stored format: "<iv-hex>:<authTag-hex>:<ciphertext-hex>"
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8');
}

// For display only — never return a stored key in full.
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return '••••••••';
  return `${plaintext.slice(0, 4)}${'•'.repeat(8)}${plaintext.slice(-4)}`;
}
