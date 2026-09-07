import { Injectable, NotFoundException } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, maskSecret } from './crypto.util';

export interface ApiKeyCreditBalance {
  available: boolean;
  totalBalance?: string;
  currency?: string;
}

export interface ApiKeyStatus {
  provider: AIProviderId;
  configured: boolean;
  maskedKey: string | null;
  updatedAt: Date | null;
  // Where an admin manages this provider's account/billing — always
  // present, since it's just a static link, not a live call.
  dashboardUrl: string;
  // Only DeepSeek exposes a real balance-check API today (see
  // fetchDeepSeekBalance below); every other provider gets `null` here
  // rather than a fabricated number — check the dashboard link instead.
  creditBalance: ApiKeyCreditBalance | null;
  creditCheckError: string | null;
}

const ALL_PROVIDERS: AIProviderId[] = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA', 'DEEPSEEK'];

// Where an admin actually manages billing/usage for each provider — shown
// as a "Dashboard ↗" link next to each row so key rotation and credit
// top-ups don't require hunting for the URL. Never shown to non-admins
// (spec §35/§41 — this whole controller is AdminGuard-only).
const PROVIDER_DASHBOARD_URL: Record<AIProviderId, string> = {
  ANTHROPIC: 'https://console.anthropic.com/settings/billing',
  OPENAI: 'https://platform.openai.com/settings/organization/billing/overview',
  GEMINI: 'https://aistudio.google.com/app/apikey',
  NVIDIA_NIM: 'https://build.nvidia.com/',
  OLLAMA: 'https://ollama.com/',
  DEEPSEEK: 'https://platform.deepseek.com/usage',
};

interface DeepSeekBalanceResponse {
  is_available: boolean;
  balance_infos: { currency: string; total_balance: string }[];
}

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

    return Promise.all(
      ALL_PROVIDERS.map(async (provider) => {
        const row = byProvider.get(provider);
        let creditBalance: ApiKeyCreditBalance | null = null;
        let creditCheckError: string | null = null;

        if (provider === 'DEEPSEEK') {
          const apiKey = row ? decryptSecret(row.encryptedKey) : process.env.DEEPSEEK_API_KEY;
          if (apiKey) {
            try {
              creditBalance = await this.fetchDeepSeekBalance(apiKey);
            } catch (err) {
              creditCheckError = err instanceof Error ? err.message : String(err);
            }
          }
        }

        return {
          provider,
          configured: Boolean(row),
          maskedKey: row ? maskSecret(decryptSecret(row.encryptedKey)) : null,
          updatedAt: row?.updatedAt ?? null,
          dashboardUrl: PROVIDER_DASHBOARD_URL[provider],
          creditBalance,
          creditCheckError,
        };
      }),
    );
  }

  // DeepSeek's balance endpoint is the only one of the six providers this
  // app supports that exposes a real, documented account-balance API — it
  // is deliberately not simulated for the others (Anthropic/OpenAI/Gemini/
  // NVIDIA NIM have no public balance endpoint; Ollama is a local server
  // with no billing concept at all), matching this project's "document
  // what's implemented, don't overclaim completeness" rule elsewhere
  // (see e.g. admin/README.md's capability mapping table).
  private async fetchDeepSeekBalance(apiKey: string): Promise<ApiKeyCreditBalance> {
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`DeepSeek balance check failed (${response.status})`);
    }
    const data = (await response.json()) as DeepSeekBalanceResponse;
    const primary = data.balance_infos?.[0];
    return {
      available: data.is_available,
      totalBalance: primary?.total_balance,
      currency: primary?.currency,
    };
  }

  async set(provider: AIProviderId, key: string): Promise<ApiKeyStatus> {
    const encryptedKey = encryptSecret(key);
    const row = await this.prisma.apiKeyConfig.upsert({
      where: { provider },
      create: { provider, encryptedKey },
      update: { encryptedKey },
    });
    return {
      provider,
      configured: true,
      maskedKey: maskSecret(key),
      updatedAt: row.updatedAt,
      dashboardUrl: PROVIDER_DASHBOARD_URL[provider],
      creditBalance: null,
      creditCheckError: null,
    };
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
