import { Injectable, NotFoundException } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, maskSecret } from './crypto.util';

export interface ApiKeyStatus {
  provider: AIProviderId;
  configured: boolean;
  maskedKey: string | null;
  updatedAt: Date | null;
}

const ALL_PROVIDERS: AIProviderId[] = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA', 'DEEPSEEK'];

// Spec §35 "Manage API keys", §41 "Secure API key storage". Keys are
// encrypted at rest (crypto.util.ts) and never returned in plaintext by
// any endpoint — only a masked preview. AnthropicProvider reads the
// decrypted value directly via getDecrypted(), falling back to the
// ANTHROPIC_API_KEY env var when no row exists here.
@Injectable()
export class AdminApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ApiKeyStatus[]> {
    const rows = await this.prisma.apiKeyConfig.findMany();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    return ALL_PROVIDERS.map((provider) => {
      const row = byProvider.get(provider);
      return {
        provider,
        configured: Boolean(row),
        maskedKey: row ? maskSecret(decryptSecret(row.encryptedKey)) : null,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  async set(provider: AIProviderId, key: string): Promise<ApiKeyStatus> {
    const encryptedKey = encryptSecret(key);
    const row = await this.prisma.apiKeyConfig.upsert({
      where: { provider },
      create: { provider, encryptedKey },
      update: { encryptedKey },
    });
    return { provider, configured: true, maskedKey: maskSecret(key), updatedAt: row.updatedAt };
  }

  async delete(provider: AIProviderId): Promise<void> {
    const row = await this.prisma.apiKeyConfig.findUnique({ where: { provider } });
    if (!row) throw new NotFoundException(`No API key configured for ${provider}`);
    await this.prisma.apiKeyConfig.delete({ where: { provider } });
  }

  // Consumed by provider implementations (e.g. AnthropicProvider) — not
  // exposed over HTTP anywhere.
  async getDecrypted(provider: AIProviderId): Promise<string | null> {
    const row = await this.prisma.apiKeyConfig.findUnique({ where: { provider } });
    return row ? decryptSecret(row.encryptedKey) : null;
  }
}
