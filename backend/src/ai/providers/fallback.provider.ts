import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { AIGenerateInput, AIGenerateOutput, AIProvider } from './ai-provider.interface';

// Tries each provider in the chain in order, falling through to the next on
// ANY failure — missing key, unreachable host, non-2xx from the vendor —
// rather than failing the whole interpretation request because one provider
// is down or unconfigured. Reports which provider actually served the
// response via AIGenerateOutput.providerId, since InterpretationService's
// usage logging and Prediction.aiProvider column must reflect what really
// ran, not just whichever provider .generate() happened to be called on.
export class FallbackAiProvider implements AIProvider {
  private readonly logger = new Logger(FallbackAiProvider.name);

  constructor(private readonly chain: AIProvider[]) {
    if (chain.length === 0) {
      throw new Error('FallbackAiProvider needs at least one provider in its chain');
    }
  }

  // Reports the PRIMARY provider's id — the one that will be tried first.
  // If a fallback ends up serving the request instead, that is surfaced via
  // AIGenerateOutput.providerId, not this property.
  get id(): AIProviderId {
    return this.chain[0].id;
  }

  async generate(input: AIGenerateInput): Promise<AIGenerateOutput> {
    const failures: string[] = [];

    for (const provider of this.chain) {
      try {
        const result = await provider.generate(input);
        if (failures.length > 0) {
          this.logger.warn(
            `AI provider "${provider.id}" served this request after ${failures.length} earlier failure(s): ${failures.join(' | ')}`,
          );
        }
        return { ...result, providerId: provider.id };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${provider.id}: ${message}`);
      }
    }

    throw new ServiceUnavailableException(`All AI providers in the fallback chain failed: ${failures.join(' | ')}`);
  }
}
