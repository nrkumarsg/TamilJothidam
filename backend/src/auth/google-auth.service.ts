import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string;
}

interface GoogleTokenResponse {
  id_token?: string;
}

interface GoogleTokenInfo {
  aud: string;
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

// Sign in with Google (Authorization Code flow), hand-rolled via fetch —
// no google-auth-library dependency, same "raw fetch over SDK" reasoning
// as AnthropicProvider. The ID token is verified by calling Google's own
// tokeninfo endpoint rather than checking the JWT signature locally
// against Google's JWKS: simpler and still secure (Google does the actual
// verification), but Google documents tokeninfo as rate-limited and not
// recommended at production scale — a high-traffic deployment should
// switch to local JWKS verification (e.g. via google-auth-library) instead.
@Injectable()
export class GoogleAuthService {
  private redirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/auth/google/callback';
  }

  buildAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
      );
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      throw new UnauthorizedException('Google rejected the authorization code');
    }
    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.id_token) {
      throw new UnauthorizedException('Google did not return an ID token');
    }

    const infoRes = await fetch(
      `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(tokenData.id_token)}`,
    );
    if (!infoRes.ok) {
      throw new UnauthorizedException('Could not verify the Google ID token');
    }
    const info = (await infoRes.json()) as GoogleTokenInfo;

    if (info.aud !== clientId) {
      throw new UnauthorizedException('Google ID token was issued for a different client');
    }
    if (info.email_verified !== 'true') {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return { googleId: info.sub, email: info.email, name: info.name };
  }
}
