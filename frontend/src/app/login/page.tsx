'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { googleLoginUrl, login, register } from '@/lib/api';
import { setSession } from '@/lib/auth';

type Mode = 'login' | 'register';
type Language = 'ta' | 'en';

const labels = {
  ta: {
    title: 'தமிழ் ஜோதிடம்',
    loginTab: 'உள்நுழைய',
    registerTab: 'புதிய கணக்கு',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    passwordHint: 'குறைந்தது 8 எழுத்துக்கள்',
    loginButton: 'உள்நுழைக',
    registerButton: 'பதிவு செய்க',
    submitting: 'செயலாக்கப்படுகிறது...',
    backHome: '← முகப்புக்குத் திரும்பு',
    error: 'பிழை',
    googleButton: 'Google மூலம் உள்நுழைக',
    orDivider: 'அல்லது',
    googleOauthError: 'Google உள்நுழைவு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
    forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
  },
  en: {
    title: 'Tamil Jothidam',
    loginTab: 'Log in',
    registerTab: 'Create account',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    loginButton: 'Log in',
    registerButton: 'Register',
    submitting: 'Working...',
    backHome: '← Back to home',
    error: 'Error',
    googleButton: 'Sign in with Google',
    orDivider: 'or',
    googleOauthError: 'Google sign-in failed. Please try again.',
    forgotPassword: 'Forgot password?',
  },
} as const;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<Language>('ta');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'google_oauth_failed' ? 'GOOGLE_OAUTH' : null,
  );
  const t = labels[language];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = mode === 'login' ? await login(email, password) : await register(email, password);
      setSession(result.accessToken, result.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{t.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => setLanguage('ta')} style={language === 'ta' ? langActive : langBtn}>
              தமிழ்
            </button>
            <button type="button" onClick={() => setLanguage('en')} style={language === 'en' ? langActive : langBtn}>
              English
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => setMode('login')} style={mode === 'login' ? tabActive : tabBtn}>
            {t.loginTab}
          </button>
          <button type="button" onClick={() => setMode('register')} style={mode === 'register' ? tabActive : tabBtn}>
            {t.registerTab}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            {t.email}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            {t.password}
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            {mode === 'register' && (
              <span style={{ fontSize: '0.75rem', color: '#999' }}>{t.passwordHint}</span>
            )}
          </label>

          {mode === 'login' && (
            <Link href={`/forgot-password?lang=${language}`} style={{ fontSize: '0.85rem', alignSelf: 'flex-end' }}>
              {t.forgotPassword}
            </Link>
          )}

          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: 0 }}>
              {error === 'GOOGLE_OAUTH' ? t.googleOauthError : `${t.error}: ${error}`}
            </p>
          )}

          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? t.submitting : mode === 'login' ? t.loginButton : t.registerButton}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ flex: 1, height: '1px', background: '#eee' }} />
          <span style={{ fontSize: '0.75rem', color: '#999' }}>{t.orDivider}</span>
          <span style={{ flex: 1, height: '1px', background: '#eee' }} />
        </div>

        <a href={googleLoginUrl()} style={googleButtonStyle}>
          <GoogleIcon />
          {t.googleButton}
        </a>

        <Link href="/" style={{ fontSize: '0.85rem' }}>
          {t.backHome}
        </Link>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem 1rem',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '380px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  border: '1px solid #eee',
  borderRadius: '10px',
  padding: '1.5rem',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  marginTop: '0.25rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '1rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.4rem',
  borderRadius: '6px',
  border: 'none',
  background: '#111',
  color: 'white',
  cursor: 'pointer',
  fontSize: '1rem',
};

const googleButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.6rem',
  padding: '0.6rem 1rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  background: 'white',
  color: '#333',
  textDecoration: 'none',
  fontSize: '0.95rem',
};

const langBtn: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.8rem',
};

const langActive: React.CSSProperties = { ...langBtn, background: '#111', color: 'white', border: '1px solid #111' };

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #ddd',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const tabActive: React.CSSProperties = { ...tabBtn, background: '#f0f0f0', fontWeight: 600, borderColor: '#111' };
