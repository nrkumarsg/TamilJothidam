'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WizardLanguage } from '@/app/new/labels';

interface Props {
  title: string;
  // Explicit back destination. Omit to fall back to browser history.
  backHref?: string;
  // Set false on top-level pages (the dashboard) where there's nowhere
  // sensible to go back to.
  showBack?: boolean;
  language: WizardLanguage;
  onLanguageChange: (language: WizardLanguage) => void;
  // Settings is the one place every logged-in page can reach; shown as the
  // profile icon on the right, matching the Stitch header's profile slot.
  settingsHref?: string;
}

// Shared top bar matching the Stitch "Chart Details" mockups: back button,
// small logo mark, page title, தமிழ்/Eng segmented toggle, profile icon.
// Used across every logged-in page so the app reads as one product instead
// of a wizard bolted onto a dashboard.
export function AppHeader({
  title,
  backHref,
  showBack = true,
  language,
  onLanguageChange,
  settingsHref = '/settings',
}: Props) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-space-xs flex items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-xs min-w-0">
          {showBack && (
            <button
              aria-label="Back"
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-primary active:opacity-70"
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
          </div>
          <h1 className="font-title-md text-title-md text-primary tracking-tight truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-space-xs flex-shrink-0">
          <div className="inline-flex items-center p-space-3xs rounded-full bg-surface-container">
            <button
              className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm ${
                language === 'ta' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => onLanguageChange('ta')}
            >
              தமிழ்
            </button>
            <button
              className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm ${
                language === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => onLanguageChange('en')}
            >
              Eng
            </button>
          </div>
          <Link
            aria-label="Settings"
            className="w-11 h-11 flex items-center justify-center rounded-full text-primary active:opacity-80"
            href={settingsHref}
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
