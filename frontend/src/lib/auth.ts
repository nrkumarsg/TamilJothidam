// Client-side token storage for Phase 17 auth. localStorage is fine here —
// this is a single-device dev-stage app, not handling anything more
// sensitive than the JWT itself (never the password).
const TOKEN_KEY = 'jathakam_access_token';
const USER_KEY = 'jathakam_user';

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  plan: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export function setSession(token: string, user: StoredUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}
