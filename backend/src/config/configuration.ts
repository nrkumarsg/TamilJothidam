// Central config reader. Everything environment-specific comes from process.env
// (populated from .env in dev) — never hard-code secrets or provider keys in code.
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string | undefined;
  defaultAyanamsa: string;
  ai: {
    defaultProvider: string;
    promptVersion: string;
  };
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: process.env.DATABASE_URL,
    defaultAyanamsa: process.env.DEFAULT_AYANAMSA ?? 'LAHIRI',
    ai: {
      defaultProvider: process.env.AI_DEFAULT_PROVIDER ?? 'anthropic',
      promptVersion: process.env.ASTROLOGY_PROMPT_VERSION ?? '1.0',
    },
  };
}
