import { AIProviderId } from '@prisma/client';

export interface AIGenerateInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface AIGenerateOutput {
  text: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

// Provider abstraction (spec §32) — the interpretation service never talks
// to a specific vendor API directly, only through this interface. Settings
// choose the active provider via AI_DEFAULT_PROVIDER; API keys are read
// from environment variables only, never hard-coded (see .env.example).
export interface AIProvider {
  readonly id: AIProviderId;
  generate(input: AIGenerateInput): Promise<AIGenerateOutput>;
}
