'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { getDefaultLanguage } from '@/lib/language';
import { BirthProfile, JathakamSummary, listJathakamsForProfile, listProfiles } from '@/lib/api';
import { labels, WizardLanguage } from '../new/labels';

interface ChartRow {
  profile: BirthProfile;
  jathakam: JathakamSummary | null;
}

// "My Charts" (spec §39's dashboard originally shipped this as a disabled
// placeholder button — see page.tsx's history comment). There's no
// dedicated "list my jathakams" endpoint: a user's charts are reached via
// their birth profiles (GET /profiles, scoped to the authenticated user),
// then each profile's jathakam (GET /jathakams/profile/:profileId) —
// mirroring how they're created (a profile, then a jathakam for it).
export default function MyChartsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>(getDefaultLanguage);
  const [rows, setRows] = useState<ChartRow[] | null>(null);
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

    async function load() {
      try {
        const profiles = await listProfiles();
        const withCharts = await Promise.all(
          profiles.map(async (profile) => {
            const jathakams = await listJathakamsForProfile(profile.id).catch(() => []);
            return { profile, jathakam: jathakams[0] ?? null };
          }),
        );
        if (!cancelled) setRows(withCharts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  if (!authChecked) return null;

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerRowStyle}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{t.myChartsTitle}</h1>
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

        {!error && rows === null && <p style={{ color: '#666' }}>{t.loadingCharts}</p>}

        {rows !== null && rows.length === 0 && (
          <div style={emptyStateStyle}>
            <p style={{ color: '#666' }}>{t.noChartsYet}</p>
            <Link href="/new" style={primaryButtonStyle}>
              {t.createFirstChartButton}
            </Link>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rows.map(({ profile, jathakam }) => (
              <li key={profile.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 600 }}>{profile.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {t.bornOnLabel}: {profile.dateOfBirth.slice(0, 10)} {profile.timeOfBirth} —{' '}
                    {profile.birthLocation.placeName}
                  </div>
                </div>
                {jathakam ? (
                  <Link href={`/jathakams/${jathakam.id}`} style={primaryButtonStyle}>
                    {t.viewChartButton}
                  </Link>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#aaa' }}>—</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p>
          <Link href="/">← {t.backToDashboard}</Link>
        </p>
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
  maxWidth: '560px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
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

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.75rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: 'none',
  background: '#111',
  color: 'white',
  textDecoration: 'none',
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'inline-block',
};
