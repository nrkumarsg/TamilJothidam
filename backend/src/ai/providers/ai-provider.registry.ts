import { Injectable } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { AIProvider } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { unimplementedProvider } from './unimplemented.provider';

// Selects the active AIProvider — from an explicit id, or from
// AI_DEFAULT_PROVIDER in the environment, defaulting to Anthropic. This is
// the one place that knows every provider id; callers only ever depend on
// the AIProvider interface (spec §32: never hard-code one provider).
@Injectable()
export class AiProviderRegistry {
  constructor(private readonly anthropic: AnthropicProvider) {}

  getProvider(id?: AIProviderId): AIProvider {
    const selected = id ?? this.defaultProviderId();
    switch (selected) {
      case 'ANTHROPIC':
        return this.anthropic;
      case 'OPENAI':
      case 'GEMINI':
      case 'NVIDIA_NIM':
      case 'OLLAMA':
        return unimplementedProvider(selected);
      default:
        return this.anthropic;
    }
  }

  private defaultProviderId(): AIProviderId {
    const raw = (process.env.AI_DEFAULT_PROVIDER ?? 'anthropic').toUpperCase();
    const known: AIProviderId[] = ['ANTHROPIC', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA'];
    return (known as string[]).includes(raw) ? (raw as AIProviderId) : 'ANTHROPIC';
  }
}
