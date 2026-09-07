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
    <main className="min-h-screen bg-surface flex items-center justify-center px-margin-mobile py-space-xl">
      <div className="w-full max-w-[400px] bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md">
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-2xs min-w-0">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-primary truncate">{t.title}</h1>
          </div>
          <div className="inline-flex items-center p-space-3xs rounded-full bg-surface-container flex-shrink-0">
            <button
              className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm ${
                language === 'ta' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => setLanguage('ta')}
            >
              தமிழ்
            </button>
            <button
              className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm ${
                language === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => setLanguage('en')}
            >
              English
            </button>
          </div>
        </div>

        <div className="flex gap-space-xs p-space-3xs bg-surface-container rounded-xl">
          <button
            className={`flex-1 py-space-xs rounded-lg font-label-md text-label-md transition-colors ${
              mode === 'login' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
            type="button"
            onClick={() => setMode('login')}
          >
            {t.loginTab}
          </button>
          <button
            className={`flex-1 py-space-xs rounded-lg font-label-md text-label-md transition-colors ${
              mode === 'register' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
            }`}
            type="button"
            onClick={() => setMode('register')}
          >
            {t.registerTab}
          </button>
        </div>

        <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-space-2xs">
            <span className="font-label-md text-label-md text-on-surface-variant">{t.email}</span>
            <input
              required
              className="w-full px-space-sm py-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-space-2xs">
            <span className="font-label-md text-label-md text-on-surface-variant">{t.password}</span>
            <input
              required
              className="w-full px-space-sm py-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              minLength={mode === 'register' ? 8 : undefined}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && (
              <span className="font-label-sm text-label-sm text-outline">{t.passwordHint}</span>
            )}
          </label>

          {mode === 'login' && (
            <Link
              className="self-end font-label-sm text-label-sm text-secondary"
              href={`/forgot-password?lang=${language}`}
            >
              {t.forgotPassword}
            </Link>
          )}

          {error && (
            <p className="text-error font-body-sm text-body-sm m-0">
              {error === 'GOOGLE_OAUTH' ? t.googleOauthError : `${t.error}: ${error}`}
            </p>
          )}

          <button
            className="w-full py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t.submitting : mode === 'login' ? t.loginButton : t.registerButton}
          </button>
        </form>

        <div className="flex items-center gap-space-sm">
          <span className="flex-1 h-px bg-outline-variant" />
          <span className="font-label-sm text-label-sm text-outline">{t.orDivider}</span>
          <span className="flex-1 h-px bg-outline-variant" />
        </div>

        <a
          className="flex items-center justify-center gap-space-xs px-space-md py-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface"
          href={googleLoginUrl()}
        >
          <GoogleIcon />
          {t.googleButton}
        </a>

        <Link className="font-label-sm text-label-sm text-on-surface-variant" href="/">
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
