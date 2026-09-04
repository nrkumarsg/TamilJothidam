'use client';

import { DashaSummary } from '@/lib/api';
import { GRAHA_ABBREV } from '@/components/chart/graha-labels';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  dasha: DashaSummary;
}

function grahaName(graha: string, language: WizardLanguage): string {
  return GRAHA_ABBREV[graha]?.[language] ?? graha;
}

function formatDate(iso: string, language: WizardLanguage): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function DashaPanel({ language, dasha }: Props) {
  const t = labels[language];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={currentBoxStyle}>
        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.35rem' }}>{t.currentDashaLabel}</div>
        <DashaRow
          label={t.mahadashaLabel}
          period={dasha.mahadasha.current}
          language={language}
          strong
        />
        <DashaRow label={t.antardashaLabel} period={dasha.antardasha.current} language={language} indent={1} />
        <DashaRow
          label={t.pratyantardashaLabel}
          period={dasha.pratyantardasha.current}
          language={language}
          indent={2}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
        <div>
          <strong>{t.previousMahadashaLabel}:</strong>{' '}
          {dasha.mahadasha.previous ? grahaName(dasha.mahadasha.previous.graha, language) : t.none}
        </div>
        <div>
          <strong>{t.nextMahadashaLabel}:</strong>{' '}
          {dasha.mahadasha.next ? grahaName(dasha.mahadasha.next.graha, language) : t.none}
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.85rem', color: '#555' }}>{t.mahadashaTimelineTitle}</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '320px' }}>
            <tbody>
              {dasha.mahadashaList.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>{grahaName(m.graha, language)}</td>
                  <td style={{ padding: '0.3rem 0.5rem', color: '#666' }}>
                    {formatDate(m.startDate, language)} {t.toLabel} {formatDate(m.endDate, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DashaRow({
  label,
  period,
  language,
  strong,
  indent = 0,
}: {
  label: string;
  period: { graha: string; startDate: string; endDate: string } | null;
  language: WizardLanguage;
  strong?: boolean;
  indent?: number;
}) {
  const t = labels[language];
  return (
    <div style={{ marginLeft: `${indent * 1}rem`, fontSize: strong ? '0.95rem' : '0.85rem' }}>
      <strong>{label}:</strong>{' '}
      {period ? (
        <>
          {grahaName(period.graha, language)} ({formatDate(period.startDate, language)} {t.toLabel}{' '}
          {formatDate(period.endDate, language)})
        </>
      ) : (
        t.none
      )}
    </div>
  );
}

const currentBoxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.75rem',
};
