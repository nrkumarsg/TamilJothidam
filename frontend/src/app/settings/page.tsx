'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getStoredUser, isLoggedIn } from '@/lib/auth';
import { getDefaultLanguage, setDefaultLanguage } from '@/lib/language';
import { AuthUser, deleteAccount, getMe } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { labels, WizardLanguage } from '../new/labels';

// Real, currently-supported account actions only: viewing account info,
// picking the default display language for this device, logging out, and
// permanently deleting the account (DELETE /auth/me, Phase 17 — cascades
// through every profile/jathakam/report the account owns). No password
// change or profile-editing endpoints exist yet (see
// backend/src/auth/README.md's "Known limitations"), so this page doesn't
// pretend they do.
export default function SettingsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>(getDefaultLanguage);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = labels[language];

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);

    const stored = getStoredUser();
    if (stored) setUser(stored);

    getMe()
      .then(setUser)
      .catch(() => {
        // Stored session data (already shown above) is enough to render
        // this page even if the refresh call fails.
      });
  }, [router]);

  function handleLanguageChange(next: WizardLanguage) {
    setLanguage(next);
    setDefaultLanguage(next);
  }

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  async function handleDeleteAccount() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      clearSession();
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-surface">
      <AppHeader backHref="/" language={language} title={t.settingsTitle} onLanguageChange={handleLanguageChange} />

      <div className="px-margin-mobile py-space-md flex flex-col gap-space-md max-w-[560px] mx-auto">
        <Card icon="account_circle" title={t.settingsAccountSection}>
          <div className="flex flex-col gap-space-xs font-body-md text-body-md">
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{t.settingsEmailLabel}</span>
              <span className="text-on-surface font-semibold truncate">{user?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{t.settingsRoleLabel}</span>
              <span className="text-on-surface font-semibold">{user?.role ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{t.settingsPlanLabel}</span>
              <span className="text-on-surface font-semibold">{user?.plan ?? '—'}</span>
            </div>
          </div>
        </Card>

        <Card icon="translate" title={t.settingsLanguageSection}>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0 mb-space-sm">{t.settingsLanguageNote}</p>
          <div className="inline-flex items-center p-space-3xs rounded-full bg-surface-container">
            <button
              className={`px-space-md py-space-xs rounded-full font-label-md text-label-md ${
                language === 'ta' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => handleLanguageChange('ta')}
            >
              {t.tamil}
            </button>
            <button
              className={`px-space-md py-space-xs rounded-full font-label-md text-label-md ${
                language === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
              type="button"
              onClick={() => handleLanguageChange('en')}
            >
              {t.english}
            </button>
          </div>
        </Card>

        <button
          className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant text-primary font-label-lg text-label-lg shadow-sm self-start"
          type="button"
          onClick={handleLogout}
        >
          {t.settingsLogoutButton}
        </button>

        <Card icon="warning" title={t.settingsDangerZone}>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0 mb-space-sm">
            {t.settingsDeleteAccountNote}
          </p>
          {error && (
            <p className="text-error font-body-sm text-body-sm mb-space-sm">
              {t.error}: {error}
            </p>
          )}
          {confirmingDelete && (
            <p className="text-error font-body-sm text-body-sm font-semibold mb-space-sm">
              {t.settingsDeleteConfirmPrompt}
            </p>
          )}
          <div className="flex gap-space-xs">
            <button
              className="px-space-md py-space-xs rounded-lg bg-error text-on-error font-label-md text-label-md disabled:opacity-60"
              disabled={deleting}
              type="button"
              onClick={handleDeleteAccount}
            >
              {deleting ? t.settingsDeleting : t.settingsDeleteAccountButton}
            </button>
            {confirmingDelete && !deleting && (
              <button
                className="px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md"
                type="button"
                onClick={() => setConfirmingDelete(false)}
              >
                {t.back}
              </button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
