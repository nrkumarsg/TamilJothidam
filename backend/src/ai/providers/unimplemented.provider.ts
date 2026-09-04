import { NotImplementedException } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { AIProvider } from './ai-provider.interface';

// Placeholder for providers named in spec §32 (OpenAI, Gemini, NVIDIA NIM,
// Ollama) that are not yet wired up — only Anthropic is a real
// implementation for now (decided with the user in Phase 1). Exists so the
// registry can name every provider the settings UI will eventually offer
// without silently defaulting to the wrong one, and so adding a real
// implementation later is a one-file change, not a registry redesign.
export function unimplementedProvider(id: AIProviderId): AIProvider {
  return {
    id,
    async generate() {
      throw new NotImplementedException(
        `AI provider "${id}" is not implemented yet. Only ANTHROPIC is currently wired up — see docs/ARCHITECTURE.md § AI architecture.`,
      );
    },
  };
}
