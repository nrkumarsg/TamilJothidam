'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredUser } from '@/lib/auth';
import {
  AdminReport,
  AdminUser,
  AiProviderInfo,
  ApiKeyStatus,
  LanguageInfo,
  PromptFileInfo,
  RuleInfo,
  UsageSummary,
  deleteApiKey,
  deleteUser,
  getLanguages,
  getUsageSummary,
  listAdminReports,
  listAiProviders,
  listApiKeys,
  listDoshaRules,
  listPrompts,
  listUsageLogs,
  listUsers,
  listYogaRules,
  setApiKey,
  updateUser,
  UsageLogEntry,
} from '@/lib/admin-api';

type Tab = 'users' | 'usage' | 'reports' | 'apiKeys' | 'catalog';

// Spec §35 admin panel. Deliberately English-only and utilitarian —
// internal tooling, not the bilingual public-facing wizard. Access is
// enforced server-side by AdminGuard regardless of what this page shows;
// the role check here is only to avoid flashing admin UI at a user who
// will immediately get 403s.
export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('users');

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <main style={pageStyle}>
        <p>Admin access required.</p>
        <Link href="/">← Back to home</Link>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Admin Panel</h1>
        <Link href="/" style={{ fontSize: '0.85rem' }}>
          ← Back to home
        </Link>
      </div>

      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(['users', 'usage', 'reports', 'apiKeys', 'catalog'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={tab === t ? tabActive : tabBtn}>
            {tabLabel(t)}
          </button>
        ))}
      </nav>

      {tab === 'users' && <UsersTab />}
      {tab === 'usage' && <UsageTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'apiKeys' && <ApiKeysTab />}
      {tab === 'catalog' && <CatalogTab />}
    </main>
  );
}

function tabLabel(t: Tab): string {
  return { users: 'Users', usage: 'Usage', reports: 'Reports', apiKeys: 'API Keys', catalog: 'Catalog' }[t];
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listUsers().then(setUsers).catch((err) => setError(String(err)));
  }
  useEffect(reload, []);

  async function handleRoleChange(id: string, role: AdminUser['role']) {
    try {
      await updateUser(id, { role });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handlePlanChange(id: string, plan: AdminUser['plan']) {
    try {
      await updateUser(id, { plan });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!window.confirm(`Delete account "${email}"? This deletes all their profiles, jathakams, and reports too.`)) {
      return;
    }
    try {
      await deleteUser(id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (error) return <p style={errorStyle}>{error}</p>;
  if (!users) return <p>Loading...</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Plan</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={tdStyle}>{u.email}</td>
              <td style={tdStyle}>
                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as AdminUser['role'])}>
                  <option value="USER">USER</option>
                  <option value="ASTROLOGER">ASTROLOGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={tdStyle}>
                <select value={u.plan} onChange={(e) => handlePlanChange(u.id, e.target.value as AdminUser['plan'])}>
                  {['FREE', 'BASIC', 'PREMIUM', 'PROFESSIONAL', 'ASTROLOGER'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </td>
              <td style={tdStyle}>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td style={tdStyle}>
                <button type="button" style={dangerBtn} onClick={() => handleDelete(u.id, u.email)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageTab() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<UsageLogEntry[] | null>(null);
  const [filter, setFilter] = useState<UsageLogEntry['eventType'] | ''>('');

  useEffect(() => {
    getUsageSummary().then(setSummary);
  }, []);
  useEffect(() => {
    listUsageLogs(filter || undefined).then(setLogs);
  }, [filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {summary && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatCard label="Jathakams created" value={summary.jathakamsCreated} />
          <StatCard label="Predictions generated" value={summary.predictionsGenerated} />
          <StatCard label="Input tokens" value={summary.totalInputTokens} />
          <StatCard label="Output tokens" value={summary.totalOutputTokens} />
          <StatCard label="PDFs generated" value={summary.pdfsGenerated} />
          <StatCard label="Errors" value={summary.errors} highlight={summary.errors > 0} />
        </div>
      )}

      <label style={{ fontSize: '0.85rem' }}>
        Filter by event type:{' '}
        <select value={filter} onChange={(e) => setFilter(e.target.value as UsageLogEntry['eventType'] | '')}>
          <option value="">All</option>
          <option value="JATHAKAM_CREATED">JATHAKAM_CREATED</option>
          <option value="PREDICTION_GENERATED">PREDICTION_GENERATED</option>
          <option value="PDF_GENERATED">PDF_GENERATED</option>
          <option value="ERROR">ERROR</option>
        </select>
      </label>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Jathakam</th>
              <th style={thStyle}>Provider / Model</th>
              <th style={thStyle}>Tokens (in/out)</th>
              <th style={thStyle}>Error</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td style={tdStyle}>{new Date(l.createdAt).toLocaleString()}</td>
                <td style={tdStyle}>{l.eventType}</td>
                <td style={tdStyle}>{l.jathakamId?.slice(0, 8) ?? '—'}</td>
                <td style={tdStyle}>
                  {l.aiProvider ?? '—'} {l.aiModel ?? ''}
                </td>
                <td style={tdStyle}>
                  {l.inputTokens ?? '—'} / {l.outputTokens ?? '—'}
                </td>
                <td style={{ ...tdStyle, color: '#c0392b' }}>{l.errorMessage ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ ...statCardStyle, borderColor: highlight ? '#c0392b' : '#ddd' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: highlight ? '#c0392b' : '#111' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  useEffect(() => {
    listAdminReports().then(setReports);
  }, []);

  if (!reports) return <p>Loading...</p>;
  if (reports.length === 0) return <p style={{ color: '#666' }}>No reports generated yet.</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Profile</th>
            <th style={thStyle}>Jathakam</th>
            <th style={thStyle}>Language</th>
            <th style={thStyle}>Generated</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td style={tdStyle}>{r.jathakam.profile.name}</td>
              <td style={tdStyle}>{r.jathakamId.slice(0, 8)}</td>
              <td style={tdStyle}>{r.language}</td>
              <td style={tdStyle}>{new Date(r.generatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PROVIDERS = ['ANTHROPIC', 'DEEPSEEK', 'OPENAI', 'GEMINI', 'NVIDIA_NIM', 'OLLAMA'];

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftProvider, setDraftProvider] = useState('ANTHROPIC');
  const [draftKey, setDraftKey] = useState('');

  function reload() {
    listApiKeys().then(setKeys).catch((err) => setError(String(err)));
  }
  useEffect(reload, []);

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    try {
      await setApiKey(draftProvider, draftKey);
      setDraftKey('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(provider: string) {
    try {
      await deleteApiKey(provider);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <p style={errorStyle}>{error}</p>}

      <form onSubmit={handleSet} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={draftProvider} onChange={(e) => setDraftProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="password"
          placeholder="API key"
          required
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          style={{ padding: '0.4rem', flex: 1, minWidth: '200px' }}
        />
        <button type="submit" style={primaryBtn}>
          Save
        </button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Provider</th>
              <th style={thStyle}>Configured</th>
              <th style={thStyle}>Key (masked)</th>
              <th style={thStyle}>Updated</th>
              <th style={thStyle}>Credit balance</th>
              <th style={thStyle}>Dashboard</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {(keys ?? []).map((k) => (
              <tr key={k.provider}>
                <td style={tdStyle}>{k.provider}</td>
                <td style={tdStyle}>{k.configured ? 'Yes' : 'No'}</td>
                <td style={tdStyle}>{k.maskedKey ?? '—'}</td>
                <td style={tdStyle}>{k.updatedAt ? new Date(k.updatedAt).toLocaleDateString() : '—'}</td>
                <td style={tdStyle}>
                  {k.creditBalance ? (
                    `${k.creditBalance.totalBalance ?? '?'} ${k.creditBalance.currency ?? ''}`.trim()
                  ) : k.creditCheckError ? (
                    <span style={{ color: '#c0392b', fontSize: '0.8rem' }} title={k.creditCheckError}>
                      check failed
                    </span>
                  ) : (
                    <span style={{ color: '#999' }}>— (see dashboard)</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <a href={k.dashboardUrl} target="_blank" rel="noreferrer">
                    Open ↗
                  </a>
                </td>
                <td style={tdStyle}>
                  {k.configured && (
                    <button type="button" style={dangerBtn} onClick={() => handleDelete(k.provider)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#999' }}>
        Keys are encrypted at rest (AES-256-GCM) and never shown in full once saved.
      </p>
    </div>
  );
}

function CatalogTab() {
  const [yogas, setYogas] = useState<RuleInfo[] | null>(null);
  const [doshas, setDoshas] = useState<RuleInfo[] | null>(null);
  const [prompts, setPrompts] = useState<PromptFileInfo[] | null>(null);
  const [languages, setLanguages] = useState<LanguageInfo | null>(null);
  const [providers, setProviders] = useState<AiProviderInfo[] | null>(null);

  useEffect(() => {
    listYogaRules().then(setYogas);
    listDoshaRules().then(setDoshas);
    listPrompts().then(setPrompts);
    getLanguages().then(setLanguages);
    listAiProviders().then(setProviders);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>
        Read-only: these are code/files, not database rows a form could edit without a larger redesign — see
        backend/src/admin/README.md.
      </p>

      <section>
        <h3 style={sectionHeading}>AI Providers</h3>
        <ul style={listStyle}>
          {(providers ?? []).map((p) => (
            <li key={p.id}>
              <strong>{p.id}</strong> — {p.implemented ? 'implemented' : 'not implemented'}
              {p.active ? ' · active' : ''} {p.apiKeyConfigured ? '· key configured' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 style={sectionHeading}>Languages</h3>
        {languages && (
          <p style={{ fontSize: '0.9rem' }}>
            Default: {languages.defaultLocale} · Actively translated: {languages.activelyTranslated.join(', ')} ·{' '}
            {languages.recognizedByCoreTermsCount} core terms glossed
          </p>
        )}
      </section>

      <section>
        <h3 style={sectionHeading}>Yoga Rules ({yogas?.length ?? '…'})</h3>
        <ul style={listStyle}>
          {(yogas ?? []).map((y) => (
            <li key={y.name}>
              <strong>{y.name}</strong>
              {y.description ? ` — ${y.description.en}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 style={sectionHeading}>Dosha Rules ({doshas?.length ?? '…'})</h3>
        <ul style={listStyle}>
          {(doshas ?? []).map((d) => (
            <li key={d.name}>
              <strong>{d.name}</strong>
              {d.description ? ` — ${d.description.en}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 style={sectionHeading}>Prompt Files ({prompts?.length ?? '…'})</h3>
        <ul style={listStyle}>
          {(prompts ?? []).map((p) => (
            <li key={p.path}>
              {p.path} — updated {new Date(p.updatedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '2rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const tabBtn: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  borderRadius: '6px',
  border: '1px solid #ddd',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const tabActive: React.CSSProperties = { ...tabBtn, background: '#111', color: 'white', borderColor: '#111' };

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.4rem' };
const tdStyle: React.CSSProperties = { borderBottom: '1px solid #eee', padding: '0.4rem' };

const primaryBtn: React.CSSProperties = {
  padding: '0.4rem 1rem',
  borderRadius: '6px',
  border: 'none',
  background: '#111',
  color: 'white',
  cursor: 'pointer',
};

const dangerBtn: React.CSSProperties = {
  padding: '0.25rem 0.6rem',
  borderRadius: '4px',
  border: '1px solid #c0392b',
  background: 'white',
  color: '#c0392b',
  cursor: 'pointer',
  fontSize: '0.75rem',
};

const errorStyle: React.CSSProperties = { color: '#c0392b', fontSize: '0.85rem' };

const statCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '0.6rem 1rem',
  minWidth: '110px',
};

const sectionHeading: React.CSSProperties = { fontSize: '1rem', margin: '0 0 0.5rem' };
const listStyle: React.CSSProperties = { margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' };
