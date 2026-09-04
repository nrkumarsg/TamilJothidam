'use client';

import { TransitSummary } from '@/lib/api';
import { GRAHA_ABBREV } from '@/components/chart/graha-labels';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  transits: TransitSummary;
}

function grahaName(graha: string, language: WizardLanguage): string {
  return GRAHA_ABBREV[graha]?.[language] ?? graha;
}

export function TransitPanel({ language, transits }: Props) {
  const t = labels[language];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...noteStyle }}>{t.transitNote}</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '480px' }}>
          <thead>
            <tr>
              <th style={thStyle}>{t.transitGrahaCol}</th>
              <th style={thStyle}>{t.transitSignCol}</th>
              <th style={thStyle}>{t.houseFromMoonCol}</th>
              <th style={thStyle}>{t.houseFromLagnaCol}</th>
            </tr>
          </thead>
          <tbody>
            {transits.transits.map((tr) => (
              <tr key={tr.graha} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  {grahaName(tr.graha, language)}
                  {tr.retrograde && <span style={{ color: '#999' }}> ({language === 'ta' ? 'வ' : 'R'})</span>}
                </td>
                <td style={tdStyle}>{language === 'ta' ? tr.signName.ta : tr.signName.en}</td>
                <td style={tdStyle}>{tr.houseFromMoon}</td>
                <td style={tdStyle}>{tr.houseFromLagna}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={flagsBoxStyle}>
        <div>
          <strong>{t.sadeSatiLabel}:</strong>{' '}
          {transits.sadeSati.active && transits.sadeSati.phase
            ? t.sadeSatiPhase[transits.sadeSati.phase]
            : t.sadeSatiInactive}
        </div>
        <div>
          <strong>{t.ashtamaShaniLabel}:</strong> {transits.ashtamaShani ? t.yesLabel : t.noLabel}
        </div>
        <div>
          <strong>{t.janmaShaniLabel}:</strong> {transits.janmaShani ? t.yesLabel : t.noLabel}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.35rem 0.5rem',
  borderBottom: '2px solid #333',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
};

const noteStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#666',
  margin: 0,
};

const flagsBoxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.6rem 0.75rem',
  fontSize: '0.85rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};
