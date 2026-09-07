'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api';

type Language = 'ta' | 'en';

const labels = {
  ta: {
    title: 'கடவுச்சொல் மீட்டமைப்பு',
    email: 'மின்னஞ்சல்',
    submit: 'மீட்டமைப்பு இணைப்பை அனுப்பு',
    submitting: 'அனுப்பப்படுகிறது...',
    sentMessage:
      'இந்த மின்னஞ்சல் பதிவு செய்யப்பட்டிருந்தால், கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டுள்ளது. உங்கள் இன்பாக்ஸை சரிபார்க்கவும் (30 நிமிடங்களுக்கு செல்லுபடியாகும்).',
    backLogin: '← உள்நுழைவுக்குத் திரும்பு',
  },
  en: {
    title: 'Reset your password',
    email: 'Email',
    submit: 'Send reset link',
    submitting: 'Sending...',
    sentMessage:
      "If that email is registered, a password reset link has been sent. Check your inbox (valid for 30 minutes).",
    backLogin: '← Back to login',
  },
} as const;

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const initialLang = searchParams.get('lang') === 'en' ? 'en' : 'ta';
  const [language, setLanguage] = useState<Language>(initialLang);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const t = labels[language];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email, language);
    } finally {
      // Always show the same success message, even on a network error —
      // matches the backend's "never reveal whether the email exists"
      // stance; a transient failure here shouldn't leak more than that.
      setSubmitting(false);
      setSent(true);
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

        {sent ? (
          <p style={{ fontSize: '0.9rem', color: '#333' }}>{t.sentMessage}</p>
        ) : (
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
            <button type="submit" disabled={submitting} style={primaryButtonStyle}>
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        )}

        <Link href="/login" style={{ fontSize: '0.85rem' }}>
          {t.backLogin}
        </Link>
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
