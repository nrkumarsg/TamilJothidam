'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { getDefaultLanguage } from '@/lib/language';
import { BirthProfile, JathakamSummary, listJathakamsForProfile, listProfiles } from '@/lib/api';
import { labels, WizardLanguage } from '../new/labels';
import { AppHeader } from '@/components/layout/AppHeader';

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
    <main className="min-h-screen bg-surface">
      <AppHeader backHref="/" language={language} title={t.myChartsTitle} onLanguageChange={setLanguage} />

      <div className="px-margin-mobile py-space-md flex flex-col gap-space-sm max-w-[640px] mx-auto">
        {error && (
          <p className="text-error font-body-md text-body-md">
            {t.error}: {error}
          </p>
        )}

        {!error && rows === null && <p className="text-on-surface-variant font-body-md text-body-md">{t.loadingCharts}</p>}

        {rows !== null && rows.length === 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col items-start gap-space-sm">
            <p className="font-body-md text-body-md text-on-surface-variant m-0">{t.noChartsYet}</p>
            <Link
              className="px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md"
              href="/new"
            >
              {t.createFirstChartButton}
            </Link>
          </div>
        )}

        {rows !== null && rows.length > 0 && (
          <ul className="flex flex-col gap-space-xs list-none p-0 m-0">
            {rows.map(({ profile, jathakam }) => (
              <li
                key={profile.id}
                className="bg-surface-container-lowest rounded-xl p-space-sm shadow-sm flex items-center justify-between gap-space-sm"
              >
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary truncate">{profile.name}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {t.bornOnLabel}: {profile.dateOfBirth.slice(0, 10)} {profile.timeOfBirth} —{' '}
                    {profile.birthLocation.placeName}
                  </div>
                </div>
                {jathakam ? (
                  <Link
                    className="flex-shrink-0 px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md"
                    href={`/jathakams/${jathakam.id}`}
                  >
                    {t.viewChartButton}
                  </Link>
                ) : (
                  <span className="flex-shrink-0 font-body-sm text-body-sm text-outline">—</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
