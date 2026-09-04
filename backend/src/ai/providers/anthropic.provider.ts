import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AIGenerateInput, AIGenerateOutput, AIProvider } from './ai-provider.interface';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5';
const DEFAULT_MAX_TOKENS = 4096;

interface AnthropicResponse {
  model: string;
  content: { type: string; text?: string }[];
  usage?: { input_tokens: number; output_tokens: number };
}

// First working AIProvider implementation (decided with the user in
// Phase 1). Talks to the Anthropic Messages API directly via fetch — no
// SDK dependency needed for a single POST endpoint. The API key is read,
// in order of preference: (1) the admin-managed, encrypted key from
// AdminApiKeysService (Phase 18, spec §35/§41), (2) the ANTHROPIC_API_KEY
// env var — never hard-coded, never logged either way.
@Injectable()
export class AnthropicProvider implements AIProvider {
  readonly id = 'ANTHROPIC' as const;

  constructor(private readonly apiKeys: AdminApiKeysService) {}

  async generate({ systemPrompt, userPrompt, maxTokens }: AIGenerateInput): Promise<AIGenerateOutput> {
    const apiKey = (await this.apiKeys.getDecrypted('ANTHROPIC')) ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'No ANTHROPIC API key configured. Set one via the admin panel (POST /admin/api-keys) or ANTHROPIC_API_KEY in backend/.env.',
      );
    }
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Could not reach the Anthropic API');
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const text = data.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('');

    return {
      text,
      model: data.model ?? model,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : undefined,
    };
  }
}
