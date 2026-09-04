'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch, parseJsonOrThrow, AuthUser } from '@/lib/api';
import { setSession } from '@/lib/auth';

// Where GET /auth/google/callback (backend) redirects the browser after a
// successful Google sign-in, carrying the issued JWT as ?token=. This page
// only has the raw token — it fetches the full user record with it, then
// stores both exactly like the regular email/password login path does.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login?error=google_oauth_failed');
      return;
    }

    // Briefly stash the token so authFetch (which reads it via
    // getToken()) can use it for the GET /auth/me call below.
    window.localStorage.setItem('jathakam_access_token', token);

    authFetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/me`)
      .then((res) => parseJsonOrThrow(res) as Promise<AuthUser>)
      .then((user) => {
        setSession(token, user);
        router.replace('/');
      })
      .catch((err) => {
        window.localStorage.removeItem('jathakam_access_token');
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [router, searchParams]);

  if (error) {
    return (
      <main style={pageStyle}>
        <p style={{ color: '#c0392b' }}>Sign-in failed: {error}</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <p style={{ color: '#666' }}>Signing you in...</p>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
