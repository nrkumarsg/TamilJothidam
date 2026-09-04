import {
  PLACEHOLDER_JWT_SECRET,
  checkProductionReadiness,
  formatReadinessReport,
  resolveCorsOrigins,
} from './production-readiness';

// A fully-configured production environment — each test below removes or
// spoils exactly one value, so a failure names precisely what broke.
const GOOD_PRODUCTION_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db:5432/jathakam',
  JWT_SECRET: 'a-genuinely-long-random-production-secret-value',
  API_KEY_ENCRYPTION_SECRET: 'another-long-random-production-secret',
  CORS_ORIGINS: 'https://jathakam.example.com',
  FRONTEND_URL: 'https://jathakam.example.com',
};

function errorsFor(env: NodeJS.ProcessEnv) {
  return checkProductionReadiness(env).filter((p) => p.severity === 'error');
}

describe('checkProductionReadiness', () => {
  it('passes a fully configured production environment', () => {
    expect(checkProductionReadiness(GOOD_PRODUCTION_ENV)).toEqual([]);
  });

  it('refuses to boot production without DATABASE_URL', () => {
    const { DATABASE_URL, ...env } = GOOD_PRODUCTION_ENV;
    expect(errorsFor(env).map((p) => p.variable)).toContain('DATABASE_URL');
  });

  it('refuses to boot production without JWT_SECRET', () => {
    const { JWT_SECRET, ...env } = GOOD_PRODUCTION_ENV;
    expect(errorsFor(env).map((p) => p.variable)).toContain('JWT_SECRET');
  });

  it('refuses to boot production with the public placeholder JWT_SECRET', () => {
    // The single most dangerous misconfiguration: .env.example's value is
    // in the repository, so anyone could mint tokens for any account.
    const env = { ...GOOD_PRODUCTION_ENV, JWT_SECRET: PLACEHOLDER_JWT_SECRET };
    const problem = errorsFor(env).find((p) => p.variable === 'JWT_SECRET');
    expect(problem).toBeDefined();
    expect(problem!.message).toMatch(/placeholder/i);
  });

  it('refuses to boot production with a too-short JWT_SECRET', () => {
    const env = { ...GOOD_PRODUCTION_ENV, JWT_SECRET: 'short' };
    expect(errorsFor(env).map((p) => p.variable)).toContain('JWT_SECRET');
  });

  it('refuses to boot production without an API key encryption secret or CORS allowlist', () => {
    const { API_KEY_ENCRYPTION_SECRET, CORS_ORIGINS, ...env } = GOOD_PRODUCTION_ENV;
    const names = errorsFor(env).map((p) => p.variable);
    expect(names).toContain('API_KEY_ENCRYPTION_SECRET');
    expect(names).toContain('CORS_ORIGINS');
  });

  it('rejects half-configured Google sign-in in either direction', () => {
    const idOnly = { ...GOOD_PRODUCTION_ENV, GOOGLE_CLIENT_ID: 'id', GOOGLE_REDIRECT_URI: 'https://x/cb' };
    expect(errorsFor(idOnly).map((p) => p.variable)).toContain('GOOGLE_CLIENT_SECRET');

    const secretOnly = { ...GOOD_PRODUCTION_ENV, GOOGLE_CLIENT_SECRET: 'secret' };
    expect(errorsFor(secretOnly).map((p) => p.variable)).toContain('GOOGLE_CLIENT_ID');
  });

  it('accepts Google sign-in when fully configured, and when entirely absent', () => {
    const fully = {
      ...GOOD_PRODUCTION_ENV,
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REDIRECT_URI: 'https://jathakam.example.com/auth/google/callback',
    };
    expect(checkProductionReadiness(fully)).toEqual([]);
    expect(checkProductionReadiness(GOOD_PRODUCTION_ENV)).toEqual([]);
  });

  it('flags a production Google config that would still redirect to localhost', () => {
    const env = { ...GOOD_PRODUCTION_ENV, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' };
    expect(errorsFor(env).map((p) => p.variable)).toContain('GOOGLE_REDIRECT_URI');
  });

  describe('development', () => {
    // Local development legitimately runs with the placeholder secret and
    // no CORS allowlist. Those must not be fatal, or nobody can work — but
    // they should still be reported.
    const devEnv: NodeJS.ProcessEnv = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://jathakam:pw@localhost:5432/jathakam',
      JWT_SECRET: PLACEHOLDER_JWT_SECRET,
    };

    it('downgrades placeholder secrets and missing CORS to warnings, never blocking local work', () => {
      const problems = checkProductionReadiness(devEnv);
      expect(problems.length).toBeGreaterThan(0);
      expect(problems.every((p) => p.severity === 'warning')).toBe(true);
    });

    it('still treats a missing DATABASE_URL or JWT_SECRET as fatal even locally', () => {
      // Nothing works without these, so warning about them would just
      // produce a confusing crash later.
      expect(errorsFor({ NODE_ENV: 'development' }).map((p) => p.variable).sort()).toEqual([
        'DATABASE_URL',
        'JWT_SECRET',
      ]);
    });
  });
});

describe('formatReadinessReport', () => {
  it('names the variable and severity of each problem', () => {
    const report = formatReadinessReport(checkProductionReadiness({ NODE_ENV: 'production' }));
    expect(report).toContain('[ERROR]');
    expect(report).toContain('DATABASE_URL');
    expect(report).toContain('JWT_SECRET');
  });
});

describe('resolveCorsOrigins', () => {
  it('parses a comma-separated allowlist, trimming whitespace', () => {
    expect(
      resolveCorsOrigins({ CORS_ORIGINS: 'https://a.example.com, https://b.example.com' }, 'production'),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('reflects any origin in development when nothing is configured', () => {
    expect(resolveCorsOrigins({}, 'development')).toBe(true);
  });

  it('never falls back to allow-all in production', () => {
    // Boot is already refused in this case, but the fallback must not be
    // permissive even so — defence in depth.
    expect(resolveCorsOrigins({}, 'production')).toBe(false);
  });

  it('ignores empty entries from a trailing comma', () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: 'https://a.example.com,' }, 'production')).toEqual([
      'https://a.example.com',
    ]);
  });
});
