'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser, StoredUser } from '@/lib/auth';
import { getDefaultLanguage } from '@/lib/language';
import { AppHeader } from '@/components/layout/AppHeader';
import { WizardLanguage } from './new/labels';

// Minimal dashboard shell (spec §39). "புதிய ஜாதகம் உருவாக்கு" (create),
// "எனது ஜாதகங்கள்" (my charts, /jathakams), and "அமைப்புகள்" (settings,
// /settings) are wired up; "அறிக்கைகள்" (reports) still needs a dedicated
// page. Auth (Phase 17) gates entry to this page.
export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>(getDefaultLanguage);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <AppHeader
        language={language}
        showBack={false}
        title={language === 'ta' ? 'தமிழ் ஜோதிடம்' : 'Tamil Jothidam'}
        onLanguageChange={setLanguage}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile py-space-2xl text-center gap-space-xs">
        <h1 className="font-headline-lg text-headline-lg text-primary m-0">
          {language === 'ta' ? 'தமிழ் ஜோதிடம்' : 'Tamil Jothidam'}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant m-0">Tamil Vedic Astrology / Jathakam AI Platform</p>
        {user && <p className="font-body-sm text-body-sm text-outline m-0">{user.email}</p>}

        <nav className="flex flex-col gap-space-sm mt-space-xl w-full max-w-[320px]">
          <Link
            className="px-space-md py-space-sm rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-sm"
            href="/new"
          >
            புதிய ஜாதகம் உருவாக்கு
          </Link>
          <Link
            className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant text-primary font-label-lg text-label-lg shadow-sm"
            href="/jathakams"
          >
            எனது ஜாதகங்கள்
          </Link>
          <Link
            className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant text-primary font-label-lg text-label-lg shadow-sm"
            href="/settings"
          >
            அமைப்புகள்
          </Link>
          {user?.role === 'ADMIN' && (
            <Link
              className="px-space-md py-space-sm rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md"
              href="/admin"
            >
              Admin Panel
            </Link>
          )}
        </nav>
      </div>
    </main>
  );
}
