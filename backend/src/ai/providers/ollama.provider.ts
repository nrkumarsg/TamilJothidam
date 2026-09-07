import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { AIGenerateInput, AIGenerateOutput, AIProvider } from './ai-provider.interface';
import { AdminApiKeysService } from '../../admin/admin-api-keys.service';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.1';

interface OllamaChatResponse {
  model: string;
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

// Ollama runs locally (or on whatever host OLLAMA_BASE_URL points at).
// Unlike every other provider here, reachability of the server — not
// possession of a key — is the primary availability check: a plain local
// Ollama needs no auth at all. But some hosted Ollama-compatible endpoints
// DO gate access behind a bearer token, so this still checks the
// admin-managed key store first and sends it if one is configured; it just
// never requires one. A model must already be pulled at the target server
// (`ollama pull <model>`) before this will work — Ollama 404s rather than
// auto-downloading one.
//
// In production this is only useful if OLLAMA_BASE_URL points at a
// reachable server — the free Render deployment this project was deployed
// to has no Ollama instance next to it, so this provider will simply fail
// closed there (a normal fallback-chain miss, not a bug) unless one is set
// up separately.
@Injectable()
export class OllamaProvider implements AIProvider {
  readonly id = 'OLLAMA' as const;

  constructor(private readonly apiKeys: AdminApiKeysService) {}

  async generate({ systemPrompt, userPrompt, maxTokens }: AIGenerateInput): Promise<AIGenerateOutput> {
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
    const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    const apiKey = await this.apiKeys.getDecrypted('OLLAMA');

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          options: maxTokens ? { num_predict: maxTokens } : undefined,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(`Could not reach Ollama at ${baseUrl}`);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Ollama error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    return {
      text: data.message?.content ?? '',
      model: data.model ?? model,
      usage:
        data.prompt_eval_count !== undefined && data.eval_count !== undefined
          ? { inputTokens: data.prompt_eval_count, outputTokens: data.eval_count }
          : undefined,
    };
  }
}
