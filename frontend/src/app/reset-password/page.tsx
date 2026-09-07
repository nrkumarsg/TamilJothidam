'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/api';

type Language = 'ta' | 'en';

const labels = {
  ta: {
    title: 'புதிய கடவுச்சொல்லை அமைக்கவும்',
    missingToken: 'இந்த இணைப்பு தவறானது. மீண்டும் கடவுச்சொல் மறந்துவிட்டதா என்பதிலிருந்து தொடங்கவும்.',
    newPassword: 'புதிய கடவுச்சொல்',
    passwordHint: 'குறைந்தது 8 எழுத்துக்கள்',
    confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    mismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை',
    submit: 'கடவுச்சொல்லை மீட்டமை',
    submitting: 'சேமிக்கப்படுகிறது...',
    successMessage: 'கடவுச்சொல் புதுப்பிக்கப்பட்டது. இப்போது உள்நுழையலாம்.',
    goToLogin: 'உள்நுழைவுக்குச் செல்',
    error: 'பிழை',
    requestNewLink: 'புதிய மீட்டமைப்பு இணைப்பைக் கோருங்கள்',
  },
  en: {
    title: 'Set a new password',
    missingToken: 'This link is invalid. Start again from Forgot password.',
    newPassword: 'New password',
    passwordHint: 'At least 8 characters',
    confirmPassword: 'Confirm password',
    mismatch: 'Passwords do not match',
    submit: 'Reset password',
    submitting: 'Saving...',
    successMessage: 'Password updated. You can log in now.',
    goToLogin: 'Go to login',
    error: 'Error',
    requestNewLink: 'Request a new reset link',
  },
} as const;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [language, setLanguage] = useState<Language>('ta');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const t = labels[language];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t.mismatch);
      return;
    }
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
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
          <h1 className="font-headline-sm text-headline-sm text-primary">{t.title}</h1>
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

        {!token ? (
          <>
            <p className="text-error font-body-md text-body-md">{t.missingToken}</p>
            <Link className="font-label-sm text-label-sm text-secondary" href="/forgot-password">
              {t.requestNewLink}
            </Link>
          </>
        ) : success ? (
          <>
            <p className="font-body-md text-body-md text-on-surface">{t.successMessage}</p>
            <button
              className="w-full py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg"
              type="button"
              onClick={() => router.push('/login')}
            >
              {t.goToLogin}
            </button>
          </>
        ) : (
          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-on-surface-variant">{t.newPassword}</span>
              <input
                required
                className="w-full px-space-sm py-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                minLength={8}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <span className="font-label-sm text-label-sm text-outline">{t.passwordHint}</span>
            </label>
            <label className="flex flex-col gap-space-2xs">
              <span className="font-label-md text-label-md text-on-surface-variant">{t.confirmPassword}</span>
              <input
                required
                className="w-full px-space-sm py-space-xs rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {error && (
              <p className="text-error font-body-sm text-body-sm m-0">
                {t.error}: {error}
              </p>
            )}

            <button
              className="w-full py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
