import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

function mockFetchSequence(...responses: Partial<Response>[]) {
  const spy = jest.spyOn(global, 'fetch');
  for (const r of responses) {
    spy.mockImplementationOnce(async () => r as Response);
  }
  return spy;
}

describe('GoogleAuthService', () => {
  const service = new GoogleAuthService();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4000/auth/google/callback';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('buildAuthUrl', () => {
    it('builds a URL to Google\'s consent screen with the configured client id and redirect URI', () => {
      const url = service.buildAuthUrl();
      expect(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(true);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:4000/auth/google/callback');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    });

    it('throws ServiceUnavailableException when GOOGLE_CLIENT_ID is not set', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      expect(() => service.buildAuthUrl()).toThrow(ServiceUnavailableException);
    });
  });

  describe('exchangeCodeForProfile', () => {
    it('throws ServiceUnavailableException when Google credentials are not configured', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;
      await expect(service.exchangeCodeForProfile('a-code')).rejects.toThrow(ServiceUnavailableException);
    });

    it('returns the verified profile on a full successful exchange', async () => {
      mockFetchSequence(
        { ok: true, json: async () => ({ id_token: 'fake-id-token' }) },
        {
          ok: true,
          json: async () => ({
            aud: 'test-client-id',
            sub: 'google-user-12345',
            email: 'someone@gmail.com',
            email_verified: 'true',
            name: 'Someone',
          }),
        },
      );

      const profile = await service.exchangeCodeForProfile('a-code');
      expect(profile).toEqual({ googleId: 'google-user-12345', email: 'someone@gmail.com', name: 'Someone' });
    });

    it('throws UnauthorizedException when the token exchange itself fails', async () => {
      mockFetchSequence({ ok: false });
      await expect(service.exchangeCodeForProfile('bad-code')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no id_token comes back', async () => {
      mockFetchSequence({ ok: true, json: async () => ({}) });
      await expect(service.exchangeCodeForProfile('a-code')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the tokeninfo aud does not match our client id (token meant for someone else)', async () => {
      mockFetchSequence(
        { ok: true, json: async () => ({ id_token: 'fake-id-token' }) },
        {
          ok: true,
          json: async () => ({
            aud: 'a-completely-different-client-id',
            sub: 'google-user-12345',
            email: 'someone@gmail.com',
            email_verified: 'true',
          }),
        },
      );
      await expect(service.exchangeCodeForProfile('a-code')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the Google email is not verified', async () => {
      mockFetchSequence(
        { ok: true, json: async () => ({ id_token: 'fake-id-token' }) },
        {
          ok: true,
          json: async () => ({
            aud: 'test-client-id',
            sub: 'google-user-12345',
            email: 'someone@gmail.com',
            email_verified: 'false',
          }),
        },
      );
      await expect(service.exchangeCodeForProfile('a-code')).rejects.toThrow(UnauthorizedException);
    });
  });
});
