import { WizardLanguage } from '@/app/new/labels';

// Per-device default display language (Settings page). Each page still
// holds its own language state so switching language on one screen doesn't
// require a global re-render — this only supplies the *initial* value.
const LANGUAGE_KEY = 'jathakam_default_language';

export function getDefaultLanguage(): WizardLanguage {
  if (typeof window === 'undefined') return 'ta';
  const stored = window.localStorage.getItem(LANGUAGE_KEY);
  return stored === 'en' ? 'en' : 'ta';
}

export function setDefaultLanguage(language: WizardLanguage): void {
  window.localStorage.setItem(LANGUAGE_KEY, language);
}
