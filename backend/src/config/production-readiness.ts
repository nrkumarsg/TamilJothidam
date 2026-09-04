// Phase 20 (production deployment). Everything this app needs to run
// safely comes from environment variables — so the single most valuable
// deployment guard is refusing to start when one is missing or still set
// to a placeholder, rather than discovering it when a user hits the
// feature.
//
// Deliberately a pure function over a plain env record: no Nest, no
// process.env access inside, so it can be unit tested exhaustively.
export type ReadinessSeverity = 'error' | 'warning';

export interface ReadinessProblem {
  variable: string;
  severity: ReadinessSeverity;
  message: string;
}

// The value .env.example ships with. Deploying with this still in place
// would mean every JWT in production is signed with a secret published in
// the repository.
export const PLACEHOLDER_JWT_SECRET = 'change_me_to_a_long_random_string';

const MIN_SECRET_LENGTH = 32;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

/**
 * Checks the environment a deployment is about to boot with.
 *
 * In production every problem below is an `error` and boot is aborted. In
 * development the same checks run but downgrade to `warning`, so local work
 * (which legitimately uses the placeholder secret and no CORS allowlist)
 * keeps working while still surfacing what would block a real deploy.
 */
export function checkProductionReadiness(
  env: NodeJS.ProcessEnv,
  nodeEnv: string = env.NODE_ENV ?? 'development',
): ReadinessProblem[] {
  const isProduction = nodeEnv === 'production';
  const severity: ReadinessSeverity = isProduction ? 'error' : 'warning';
  const problems: ReadinessProblem[] = [];

  if (isBlank(env.DATABASE_URL)) {
    problems.push({
      variable: 'DATABASE_URL',
      severity: 'error', // fatal in every environment — nothing works without it
      message: 'DATABASE_URL is not set. The API cannot reach Postgres.',
    });
  }

  const jwtSecret = env.JWT_SECRET;
  if (isBlank(jwtSecret)) {
    problems.push({
      variable: 'JWT_SECRET',
      severity: 'error', // fatal everywhere: tokens would be signed with `undefined`
      message: 'JWT_SECRET is not set. Access tokens cannot be signed securely.',
    });
  } else if (jwtSecret === PLACEHOLDER_JWT_SECRET) {
    problems.push({
      variable: 'JWT_SECRET',
      severity,
      message:
        'JWT_SECRET is still the placeholder from .env.example, which is public. ' +
        'Anyone could mint valid tokens for any account. Generate a fresh random value.',
    });
  } else if (jwtSecret!.length < MIN_SECRET_LENGTH) {
    problems.push({
      variable: 'JWT_SECRET',
      severity,
      message: `JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters, which is weak for signing tokens.`,
    });
  }

  if (isBlank(env.API_KEY_ENCRYPTION_SECRET)) {
    problems.push({
      variable: 'API_KEY_ENCRYPTION_SECRET',
      severity,
      message:
        'API_KEY_ENCRYPTION_SECRET is not set. Admin-managed AI provider keys ' +
        '(POST /admin/api-keys) cannot be encrypted or read back.',
    });
  }

  if (isBlank(env.CORS_ORIGINS)) {
    problems.push({
      variable: 'CORS_ORIGINS',
      severity,
      message:
        'CORS_ORIGINS is not set. In production the API would otherwise have to ' +
        'either reject the frontend or accept requests from any origin.',
    });
  }

  // Partial OAuth config is worse than none: the Google button appears to
  // work, sends the user to Google, and then fails at the callback.
  const hasGoogleId = !isBlank(env.GOOGLE_CLIENT_ID);
  const hasGoogleSecret = !isBlank(env.GOOGLE_CLIENT_SECRET);
  if (hasGoogleId !== hasGoogleSecret) {
    problems.push({
      variable: hasGoogleId ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID',
      severity,
      message:
        'Google sign-in is half-configured: set both GOOGLE_CLIENT_ID and ' +
        'GOOGLE_CLIENT_SECRET, or neither.',
    });
  }
  if (isProduction && hasGoogleId && isBlank(env.GOOGLE_REDIRECT_URI)) {
    problems.push({
      variable: 'GOOGLE_REDIRECT_URI',
      severity,
      message:
        'Google sign-in is configured but GOOGLE_REDIRECT_URI is not set, so it would ' +
        'default to localhost and fail in production.',
    });
  }
  if (isProduction && isBlank(env.FRONTEND_URL)) {
    problems.push({
      variable: 'FRONTEND_URL',
      severity,
      message:
        'FRONTEND_URL is not set, so post-login redirects would send users to localhost.',
    });
  }

  return problems;
}

export function formatReadinessReport(problems: ReadinessProblem[]): string {
  return problems
    .map((p) => `  [${p.severity.toUpperCase()}] ${p.variable}: ${p.message}`)
    .join('\n');
}

/**
 * Parsed allowlist for CORS. Returns `true` (reflect any origin) only when
 * nothing is configured AND we're not in production — never a silent
 * allow-all in a real deployment.
 */
export function resolveCorsOrigins(
  env: NodeJS.ProcessEnv,
  nodeEnv: string = env.NODE_ENV ?? 'development',
): string[] | boolean {
  const raw = env.CORS_ORIGINS;
  if (isBlank(raw)) {
    // In production, checkProductionReadiness() has already refused to boot,
    // so this is only reachable in development.
    return nodeEnv !== 'production';
  }
  return raw!
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
