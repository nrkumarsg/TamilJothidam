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

        {!token ? (
          <>
            <p style={{ fontSize: '0.9rem', color: '#c0392b' }}>{t.missingToken}</p>
            <Link href="/forgot-password" style={{ fontSize: '0.85rem' }}>
              {t.requestNewLink}
            </Link>
          </>
        ) : success ? (
          <>
            <p style={{ fontSize: '0.9rem', color: '#333' }}>{t.successMessage}</p>
            <button type="button" style={primaryButtonStyle} onClick={() => router.push('/login')}>
              {t.goToLogin}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
              {t.newPassword}
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: '#999' }}>{t.passwordHint}</span>
            </label>
            <label>
              {t.confirmPassword}
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </label>

            {error && (
              <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: 0 }}>
                {t.error}: {error}
              </p>
            )}

            <button type="submit" disabled={submitting} style={primaryButtonStyle}>
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </main>
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

const langBtn: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.8rem',
};

const langActive: React.CSSProperties = { ...langBtn, background: '#111', color: 'white', border: '1px solid #111' };
