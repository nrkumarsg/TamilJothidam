'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { BirthTimeAccuracy, getJathakam, getProfile } from '@/lib/api';
import { labels, WizardLanguage } from '../../new/labels';
import { JathakamDetailView } from '../../new/JathakamDetailView';

// Standalone view for a previously-created chart — the counterpart to
// /new's "right after creation" results screen, reached from /jathakams
// (My Charts). Fetches the owning BirthProfile only for its timeAccuracy
// (used by JathakamDetailView's "birth time unknown" warning); everything
// else about the chart itself is fetched by JathakamDetailView.
export default function ViewJathakamPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jathakamId = params.id;

  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>('ta');
  const [timeAccuracy, setTimeAccuracy] = useState<BirthTimeAccuracy | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const t = labels[language];

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    getJathakam(jathakamId)
      .then((jathakam) => getProfile(jathakam.profileId))
      .then((profile) => {
        if (!cancelled) setTimeAccuracy(profile.timeAccuracy);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [authChecked, jathakamId]);

  if (!authChecked) return null;

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <Link href="/jathakams">← {t.myChartsTitle}</Link>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              style={language === 'ta' ? langButtonActive : langButton}
            >
              {t.tamil}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={language === 'en' ? langButtonActive : langButton}
            >
              {t.english}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: '#c0392b' }}>
            {t.error}: {error}
          </p>
        )}

        <JathakamDetailView language={language} jathakamId={jathakamId} timeAccuracy={timeAccuracy} />
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '520px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.9rem',
};

const langButton: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const langButtonActive: React.CSSProperties = {
  ...langButton,
  background: '#111',
  color: 'white',
  border: '1px solid #111',
};
