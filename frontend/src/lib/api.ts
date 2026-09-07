import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Every jathakam/profile-scoped endpoint requires auth as of Phase 17 —
// this attaches the stored bearer token the same way for every call
// instead of repeating it at each call site.
export function authFetch(input: string, init: RequestInit = {}): Promise<globalThis.Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export interface PlaceCandidate {
  placeName: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface ResolvedTimezone {
  timezone: string;
  utcOffsetMinutes: number;
  dstApplicable: boolean;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type BirthTimeAccuracy =
  | 'EXACT'
  | 'WITHIN_5_MIN'
  | 'WITHIN_15_MIN'
  | 'WITHIN_30_MIN'
  | 'UNKNOWN';

export interface CreateBirthProfilePayload {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  timeAccuracy: BirthTimeAccuracy;
  location: {
    placeName: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffsetMinutes: number;
    dstApplicable: boolean;
    manuallyCorrected: boolean;
  };
}

// The actual shape returned by the backend (backend/src/profiles/profiles.service.ts)
// — the relation is named `birthLocation`, not `location` like the create
// payload's field. dateOfBirth comes back as a full ISO datetime string
// (Prisma serializes its Date-only column that way over JSON), not the
// plain "YYYY-MM-DD" the create payload sends.
export interface BirthProfile {
  id: string;
  userId: string;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  timeAccuracy: BirthTimeAccuracy;
  createdAt: string;
  birthLocation: {
    placeName: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffsetMinutes: number;
    dstApplicable: boolean;
    manuallyCorrected: boolean;
  };
}

export interface BilingualLabel {
  ta: string;
  en: string;
}

export interface NamedPlanet {
  graha: string;
  signIndex: number;
  degreeInSign: number;
  nakshatra: number;
  pada: number;
  house: number;
  retrograde: boolean;
  combust: boolean;
  dignity: string | null;
  signName: BilingualLabel;
  nakshatraName: BilingualLabel;
  aspectsHouses: number[];
}

export interface HouseAnalysisEntry {
  houseNo: number;
  signIndex: number;
  signName: BilingualLabel;
  signification: BilingualLabel;
  lord: string;
  lordHouse: number;
  occupants: string[];
  conjunction: boolean;
  aspectingGrahas: string[];
  beneficInfluences: string[];
  maleficInfluences: string[];
  strengthScore: number | null;
}

export interface JathakamSummary {
  id: string;
  profileId: string;
  julianDay: number;
  ayanamsa: string;
  lagna: NamedPlanet | null;
  rasi: NamedPlanet | null;
  planets: NamedPlanet[];
  houses: {
    houseNo: number;
    signIndex: number;
    lord: string;
    lordHouse: number;
    occupants: string[];
    signName: BilingualLabel;
  }[];
  navamsa: {
    lagnaSignIndex: number;
    lagnaSignName: BilingualLabel;
    houses: { houseNo: number; signIndex: number; occupants: string[]; signName: BilingualLabel }[];
  } | null;
  houseAnalysis: HouseAnalysisEntry[];
  yogas: YogaEntry[];
  doshas: DoshaEntry[];
}

export interface YogaEntry {
  id: string;
  name: string;
  strength: 'LOW' | 'MODERATE' | 'STRONG';
  participatingPlanets: string[];
  participatingHouses: number[];
  description: BilingualLabel | null;
}

export interface DoshaEntry {
  id: string;
  name: string;
  severity: 'LOW' | 'MODERATE' | 'STRONG';
  ruleTriggered: string;
  description: BilingualLabel | null;
}

export interface DashaPeriod {
  graha: string;
  startDate: string;
  endDate: string;
}

export interface DashaLevelSummary {
  previous: DashaPeriod | null;
  current: DashaPeriod | null;
  next: DashaPeriod | null;
}

export interface DashaSummary {
  asOfDate: string;
  mahadasha: DashaLevelSummary;
  antardasha: DashaLevelSummary;
  pratyantardasha: DashaLevelSummary;
  mahadashaList: (DashaPeriod & { antardashas: DashaPeriod[] })[];
}

export interface TransitGrahaResult {
  graha: string;
  signIndex: number;
  signName: BilingualLabel;
  retrograde: boolean;
  houseFromMoon: number;
  houseFromLagna: number;
}

export interface TransitSummary {
  asOfDate: string;
  natalMoonSignIndex: number;
  natalLagnaSignIndex: number;
  transits: TransitGrahaResult[];
  sadeSati: { active: boolean; phase: 'RISING' | 'PEAK' | 'SETTING' | null };
  ashtamaShani: boolean;
  janmaShani: boolean;
}

export async function parseJsonOrThrow(response: globalThis.Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message ?? `Request failed with status ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join('; ') : message);
  }
  return response.json();
}

// Mirrors backend/src/auth/auth.controller.ts (Phase 17).
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  plan: string;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonOrThrow(res);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonOrThrow(res);
}

export async function forgotPassword(email: string, language: 'ta' | 'en'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, language }),
  });
  await parseJsonOrThrow(res);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  await parseJsonOrThrow(res);
}

export async function deleteAccount(): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/auth/me`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed with status ${res.status}`);
  }
}

export async function getMe(): Promise<AuthUser> {
  const res = await authFetch(`${API_BASE_URL}/auth/me`);
  return parseJsonOrThrow(res);
}

// A full-page browser redirect (window.location.href = this), not a
// fetch — it needs to leave the SPA and land on Google's own consent
// screen. See backend/src/auth/auth.controller.ts's GET /auth/google.
export function googleLoginUrl(): string {
  return `${API_BASE_URL}/auth/google`;
}

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const res = await fetch(`${API_BASE_URL}/locations/search?q=${encodeURIComponent(query)}`);
  return parseJsonOrThrow(res);
}

export async function resolveTimezone(
  latitude: number,
  longitude: number,
  localDateTime: string,
): Promise<ResolvedTimezone> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localDateTime,
  });
  const res = await fetch(`${API_BASE_URL}/locations/timezone?${params.toString()}`);
  return parseJsonOrThrow(res);
}

export async function createBirthProfile(payload: CreateBirthProfilePayload): Promise<BirthProfile> {
  const res = await authFetch(`${API_BASE_URL}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonOrThrow(res);
}

export async function createJathakam(profileId: string): Promise<JathakamSummary> {
  const res = await authFetch(`${API_BASE_URL}/jathakams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });
  return parseJsonOrThrow(res);
}

export async function getJathakam(jathakamId: string): Promise<JathakamSummary> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/jathakam/jathakam.service.ts's findForProfile — a
// profile could in principle have more than one jathakam, ordered newest
// first; the "My Charts" list only ever shows the most recent one.
export async function listJathakamsForProfile(profileId: string): Promise<JathakamSummary[]> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/profile/${profileId}`);
  return parseJsonOrThrow(res);
}

export async function listProfiles(): Promise<BirthProfile[]> {
  const res = await authFetch(`${API_BASE_URL}/profiles`);
  return parseJsonOrThrow(res);
}

export async function getProfile(profileId: string): Promise<BirthProfile> {
  const res = await authFetch(`${API_BASE_URL}/profiles/${profileId}`);
  return parseJsonOrThrow(res);
}

export async function getDasha(jathakamId: string, asOf?: string): Promise<DashaSummary> {
  const params = asOf ? `?${new URLSearchParams({ asOf }).toString()}` : '';
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/dasha${params}`);
  return parseJsonOrThrow(res);
}

export async function getTransits(jathakamId: string, asOf?: string): Promise<TransitSummary> {
  const params = asOf ? `?${new URLSearchParams({ asOf }).toString()}` : '';
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/transits${params}`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/ai/prediction.types.ts PREDICTION_SECTIONS.
export const PREDICTION_SECTIONS = [
  'basic_reading',
  'health',
  'wealth',
  'career',
  'marriage',
  'karma',
  'future',
  'graha_phalan',
  'past_life',
  'present_life',
  'business',
  'family',
  'children',
  'education',
  'foreign_travel',
  'property',
  'favorable_periods',
  'favorable_days',
  'favorable_colors',
  'favorable_numbers',
  'remedies',
  'life_timeline',
  'final_summary',
] as const;

export type PredictionSection = (typeof PREDICTION_SECTIONS)[number];
export type PredictionLanguage = 'TA' | 'EN';
export type PredictionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Prediction {
  id: string;
  jathakamId: string;
  section: PredictionSection;
  language: PredictionLanguage;
  text: string;
  confidence: PredictionConfidence;
  aiProvider: string;
  aiModel: string;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
}

// Mirrors backend/src/ai/palan-period.types.ts (Phase 15). Omitting
// palanPeriod (or passing mode: 'CURRENT') keeps the original Phase 13
// behavior — current dasha/bukti only, cached normally.
export const PALAN_PERIOD_MODES = ['CURRENT', 'NEXT_YEARS', 'WHOLE_LIFE', 'UNTIL_DASHA'] as const;
export type PalanPeriodMode = (typeof PALAN_PERIOD_MODES)[number];
export type Graha = 'SUN' | 'MOON' | 'MARS' | 'MERCURY' | 'JUPITER' | 'VENUS' | 'SATURN' | 'RAHU' | 'KETU';

export interface PalanPeriodOptions {
  mode: PalanPeriodMode;
  years?: number;
  untilMahadashaGraha?: Graha;
  untilAntardashaGraha?: Graha;
}

export async function generatePrediction(
  jathakamId: string,
  section: PredictionSection,
  language: PredictionLanguage,
  regenerate = false,
  palanPeriod?: PalanPeriodOptions,
): Promise<Prediction> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, language, regenerate, palanPeriod }),
  });
  return parseJsonOrThrow(res);
}

export async function listPredictions(jathakamId: string): Promise<Prediction[]> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/predictions`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/ai/ask-question.service.ts — free-text "ask the
// chart a question" (e.g. "when can I go abroad?"), the counterpart to the
// fixed-section Prediction above for questions that don't fit any section.
export interface AiQuestion {
  id: string;
  jathakamId: string;
  language: PredictionLanguage;
  question: string;
  answer: string;
  confidence: PredictionConfidence | null;
  aiProvider: string | null;
  aiModel: string | null;
  promptVersion: string | null;
  createdAt: string;
}

export async function askQuestion(
  jathakamId: string,
  question: string,
  language: PredictionLanguage,
): Promise<AiQuestion> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, language }),
  });
  return parseJsonOrThrow(res);
}

export async function listQuestions(jathakamId: string): Promise<AiQuestion[]> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/ask`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/i18n/glossary.ts (Phase 14).
export interface Glossary {
  defaultLocale: 'ta' | 'en';
  supportedLocales: ('ta' | 'en')[];
  grahaNames: Record<Graha | 'LAGNA', BilingualLabel>;
  coreTerms: Record<string, BilingualLabel>;
  reportSections: { id: number; slug: string; ta: string; en: string }[];
}

export async function getGlossary(): Promise<Glossary> {
  const res = await fetch(`${API_BASE_URL}/i18n/glossary`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/reports/report.types.ts (Phase 15).
export type ReportSectionStatus = 'chart_data' | 'ai_generated' | 'ai_pending' | 'unavailable';

export interface ReportSectionEntry {
  id: number;
  slug: string;
  title: BilingualLabel;
  status: ReportSectionStatus;
  predictionSection?: PredictionSection;
  prediction?: Prediction | null;
}

export interface FullReport {
  jathakamId: string;
  language: PredictionLanguage;
  generatedAt: string;
  sections: ReportSectionEntry[];
}

export async function getReport(jathakamId: string, language: PredictionLanguage): Promise<FullReport> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/report?language=${language}`);
  return parseJsonOrThrow(res);
}

// Mirrors backend/src/reports/pdf/pdf.controller.ts (Phase 16).
export interface PdfReportMeta {
  id: string;
  jathakamId: string;
  language: PredictionLanguage;
  generatedAt: string;
  downloadUrl: string;
}

export async function generatePdfReport(jathakamId: string, language: PredictionLanguage): Promise<PdfReportMeta> {
  const res = await authFetch(`${API_BASE_URL}/jathakams/${jathakamId}/report/pdf?language=${language}`, {
    method: 'POST',
  });
  return parseJsonOrThrow(res);
}

// window.open() can't attach an Authorization header, so the download link
// carries the token as a query param instead — the backend's JwtAuthGuard
// accepts either (see backend/src/auth/jwt-auth.guard.ts).
export function pdfDownloadUrl(jathakamId: string, language: PredictionLanguage): string {
  const token = getToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/jathakams/${jathakamId}/report/pdf?language=${language}${tokenParam}`;
}
