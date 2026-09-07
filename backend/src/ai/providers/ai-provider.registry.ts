import { Injectable } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { AIProvider } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { OllamaProvider } from './ollama.provider';
import { FallbackAiProvider } from './fallback.provider';
import { unimplementedProvider } from './unimplemented.provider';

const KNOWN_PROVIDERS: AIProviderId[] = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA', 'DEEPSEEK'];

// Default fallback chain behind whichever provider is primary: DeepSeek is
// the intended everyday default (cheaper per-token than Anthropic), with
// Anthropic and then Ollama as safety nets if it's unreachable or
// unconfigured. Override with AI_FALLBACK_PROVIDERS (comma-separated) or set
// it to an empty string to disable fallback entirely.
const DEFAULT_FALLBACK_CHAIN: AIProviderId[] = ['ANTHROPIC', 'OLLAMA'];

// Selects the active AIProvider — from an explicit id, or from
// AI_DEFAULT_PROVIDER in the environment, defaulting to Anthropic. This is
// the one place that knows every provider id; callers only ever depend on
// the AIProvider interface (spec §32: never hard-code one provider).
//
// getProvider() returns a FallbackAiProvider chaining the primary with its
// configured fallbacks whenever more than one provider is in play, so a
// missing key or an unreachable vendor doesn't fail the whole request —
// see fallback.provider.ts.
@Injectable()
export class AiProviderRegistry {
  constructor(
    private readonly anthropic: AnthropicProvider,
    private readonly deepseek: DeepSeekProvider,
    private readonly ollama: OllamaProvider,
  ) {}

  getProvider(id?: AIProviderId): AIProvider {
    const primaryId = id ?? this.defaultProviderId();
    const fallbackIds = this.fallbackProviderIds().filter((fallbackId) => fallbackId !== primaryId);
    const chain = [primaryId, ...fallbackIds].map((providerId) => this.resolve(providerId));
    return chain.length > 1 ? new FallbackAiProvider(chain) : chain[0];
  }

  private resolve(id: AIProviderId): AIProvider {
    switch (id) {
      case 'ANTHROPIC':
        return this.anthropic;
      case 'DEEPSEEK':
        return this.deepseek;
      case 'OLLAMA':
        return this.ollama;
      case 'OPENAI':
      case 'GEMINI':
      case 'NVIDIA_NIM':
        return unimplementedProvider(id);
      default:
        return this.anthropic;
    }
  }

  private defaultProviderId(): AIProviderId {
    const raw = (process.env.AI_DEFAULT_PROVIDER ?? 'anthropic').toUpperCase();
    return (KNOWN_PROVIDERS as string[]).includes(raw) ? (raw as AIProviderId) : 'ANTHROPIC';
  }

  // Comma-separated list, e.g. "ANTHROPIC,OLLAMA". Unset uses
  // DEFAULT_FALLBACK_CHAIN; an explicit empty string disables fallback.
  // Unrecognized entries are dropped silently rather than crashing — a typo
  // in a fallback list should degrade to "no fallback", not take down boot.
  private fallbackProviderIds(): AIProviderId[] {
    const raw = process.env.AI_FALLBACK_PROVIDERS;
    if (raw === undefined) return DEFAULT_FALLBACK_CHAIN;
    if (raw.trim() === '') return [];
    return raw
      .split(',')
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry): entry is AIProviderId => (KNOWN_PROVIDERS as string[]).includes(entry));
  }
}
