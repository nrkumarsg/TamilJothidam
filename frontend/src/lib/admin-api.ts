// Mirrors backend/src/admin/ (Phase 18). Kept separate from api.ts, which
// stays scoped to the regular user-facing wizard flows.
import { authFetch, parseJsonOrThrow } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AdminUser {
  id: string;
  email: string;
  role: 'USER' | 'ASTROLOGER' | 'ADMIN';
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'PROFESSIONAL' | 'ASTROLOGER';
  createdAt: string;
  updatedAt: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/users`));
}

export async function updateUser(
  id: string,
  patch: { role?: AdminUser['role']; plan?: AdminUser['plan'] },
): Promise<AdminUser> {
  return parseJsonOrThrow(
    await authFetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteUser(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
}

export interface AdminReport {
  id: string;
  jathakamId: string;
  language: string;
  generatedAt: string;
  jathakam: { id: string; profile: { id: string; name: string; userId: string } };
}

export async function listAdminReports(): Promise<AdminReport[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/reports`));
}

export interface UsageSummary {
  predictionsGenerated: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  pdfsGenerated: number;
  jathakamsCreated: number;
  errors: number;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/usage/summary`));
}

export interface UsageLogEntry {
  id: string;
  eventType: 'JATHAKAM_CREATED' | 'PREDICTION_GENERATED' | 'PDF_GENERATED' | 'ERROR';
  userId: string | null;
  jathakamId: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export async function listUsageLogs(eventType?: UsageLogEntry['eventType']): Promise<UsageLogEntry[]> {
  const params = eventType ? `?eventType=${eventType}` : '';
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/usage${params}`));
}

export interface ApiKeyCreditBalance {
  available: boolean;
  totalBalance?: string;
  currency?: string;
}

export interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  maskedKey: string | null;
  updatedAt: string | null;
  dashboardUrl: string;
  creditBalance: ApiKeyCreditBalance | null;
  creditCheckError: string | null;
}

export async function listApiKeys(): Promise<ApiKeyStatus[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/api-keys`));
}

export async function setApiKey(provider: string, key: string): Promise<ApiKeyStatus> {
  return parseJsonOrThrow(
    await authFetch(`${API_BASE_URL}/admin/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key }),
    }),
  );
}

export async function deleteApiKey(provider: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/admin/api-keys/${provider}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
}

export interface RuleInfo {
  name: string;
  description: { ta: string; en: string } | null;
}

export async function listYogaRules(): Promise<RuleInfo[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/rules/yogas`));
}

export async function listDoshaRules(): Promise<RuleInfo[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/rules/doshas`));
}

export interface PromptFileInfo {
  language: string;
  section: string;
  path: string;
  updatedAt: string;
}

export async function listPrompts(): Promise<PromptFileInfo[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/prompts`));
}

export interface LanguageInfo {
  defaultLocale: string;
  activelyTranslated: string[];
  recognizedByCoreTermsCount: number;
}

export async function getLanguages(): Promise<LanguageInfo> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/languages`));
}

export interface AiProviderInfo {
  id: string;
  implemented: boolean;
  active: boolean;
  apiKeyConfigured: boolean;
}

export async function listAiProviders(): Promise<AiProviderInfo[]> {
  return parseJsonOrThrow(await authFetch(`${API_BASE_URL}/admin/ai-providers`));
}
