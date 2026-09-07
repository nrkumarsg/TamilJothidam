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

        {sent ? (
          <p className="font-body-md text-body-md text-on-surface">{t.sentMessage}</p>
        ) : (
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
            <button
              className="w-full py-space-sm rounded-lg bg-primary text-on-primary font-label-lg text-label-lg disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        )}

        <Link className="font-label-sm text-label-sm text-on-surface-variant" href="/login">
          {t.backLogin}
        </Link>
      </div>
    </main>
  );
}
