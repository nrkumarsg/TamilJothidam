import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AIGenerateInput, AIGenerateOutput, AIProvider } from './ai-provider.interface';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_MAX_TOKENS = 4096;

interface DeepSeekResponse {
  model: string;
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

// DeepSeek's API is OpenAI-compatible (chat completions shape), unlike
// Anthropic's own Messages API — same key-lookup order as AnthropicProvider
// (admin-managed encrypted key first, then the env var), never hard-coded.
@Injectable()
export class DeepSeekProvider implements AIProvider {
  readonly id = 'DEEPSEEK' as const;

  constructor(private readonly apiKeys: AdminApiKeysService) {}

  async generate({ systemPrompt, userPrompt, maxTokens }: AIGenerateInput): Promise<AIGenerateOutput> {
    const apiKey = (await this.apiKeys.getDecrypted('DEEPSEEK')) ?? process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'No DEEPSEEK API key configured. Set one via the admin panel (POST /admin/api-keys) or DEEPSEEK_API_KEY in backend/.env.',
      );
    }
    const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;

    let response: Response;
    try {
      response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Could not reach the DeepSeek API');
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new InternalServerErrorException(`DeepSeek API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const text = data.choices?.[0]?.message?.content ?? '';

    return {
      text,
      model: data.model ?? model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined,
    };
  }
}
