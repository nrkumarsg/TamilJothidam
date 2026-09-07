'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { getDefaultLanguage } from '@/lib/language';
import { BirthProfile, getJathakam, getProfile } from '@/lib/api';
import { labels, WizardLanguage } from '../../new/labels';
import { JathakamDetailView } from '../../new/JathakamDetailView';
import { AppHeader } from '@/components/layout/AppHeader';

// Standalone view for a previously-created chart — the counterpart to
// /new's "right after creation" results screen, reached from /jathakams
// (My Charts). Fetches the owning BirthProfile for the banner (name, birth
// date/time/place) and timeAccuracy (used by JathakamDetailView's "birth
// time unknown" warning); everything else about the chart itself is
// fetched by JathakamDetailView.
export default function ViewJathakamPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jathakamId = params.id;

  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>(getDefaultLanguage);
  const [profile, setProfile] = useState<BirthProfile | null>(null);
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
      .then((fetchedProfile) => {
        if (!cancelled) setProfile(fetchedProfile);
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
    <main className="min-h-screen bg-surface">
      <AppHeader
        backHref="/jathakams"
        language={language}
        title={t.chartDetailsTitle}
        onLanguageChange={setLanguage}
      />

      {error && (
        <p className="px-margin-mobile pt-space-md text-error font-body-md text-body-md">
          {t.error}: {error}
        </p>
      )}

      <JathakamDetailView
        jathakamId={jathakamId}
        language={language}
        profile={
          profile
            ? {
                name: profile.name,
                dateOfBirth: profile.dateOfBirth,
                timeOfBirth: profile.timeOfBirth,
                placeName: profile.birthLocation.placeName,
              }
            : undefined
        }
        timeAccuracy={profile?.timeAccuracy}
      />
    </main>
  );
}
