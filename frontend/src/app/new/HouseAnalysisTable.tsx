'use client';

import { HouseAnalysisEntry } from '@/lib/api';
import { GRAHA_ABBREV } from '@/components/chart/graha-labels';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  houseAnalysis: HouseAnalysisEntry[];
}

function grahaLabel(graha: string, language: WizardLanguage): string {
  return GRAHA_ABBREV[graha]?.[language] ?? graha;
}

function grahaList(grahas: string[], language: WizardLanguage, none: string): string {
  return grahas.length > 0 ? grahas.map((g) => grahaLabel(g, language)).join(', ') : none;
}

export function HouseAnalysisTable({ language, houseAnalysis }: Props) {
  const t = labels[language];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{t.houseCol}</th>
            <th style={thStyle}>{t.signCol}</th>
            <th style={thStyle}>{t.significationCol}</th>
            <th style={thStyle}>{t.lordCol}</th>
            <th style={thStyle}>{t.occupantsCol}</th>
            <th style={thStyle}>{t.aspectsCol}</th>
            <th style={thStyle}>{t.influenceCol}</th>
            <th style={thStyle}>{t.strengthCol}</th>
          </tr>
        </thead>
        <tbody>
          {houseAnalysis.map((h) => (
            <tr key={h.houseNo}>
              <td style={tdStyle}>
                {h.houseNo}
                {h.conjunction && <div style={tagStyle}>{t.conjunctionTag}</div>}
              </td>
              <td style={tdStyle}>{language === 'ta' ? h.signName.ta : h.signName.en}</td>
              <td style={tdStyle}>{language === 'ta' ? h.signification.ta : h.signification.en}</td>
              <td style={tdStyle}>
                {grahaLabel(h.lord, language)} (H{h.lordHouse})
              </td>
              <td style={tdStyle}>{grahaList(h.occupants, language, t.none)}</td>
              <td style={tdStyle}>{grahaList(h.aspectingGrahas, language, t.none)}</td>
              <td style={tdStyle}>
                {h.beneficInfluences.length > 0 && (
                  <div style={{ color: '#2e7d32' }}>
                    {t.beneficShort}: {grahaList(h.beneficInfluences, language, t.none)}
                  </div>
                )}
                {h.maleficInfluences.length > 0 && (
                  <div style={{ color: '#c0392b' }}>
                    {t.maleficShort}: {grahaList(h.maleficInfluences, language, t.none)}
                  </div>
                )}
                {h.beneficInfluences.length === 0 && h.maleficInfluences.length === 0 && t.none}
              </td>
              <td style={tdStyle}>{h.strengthScore !== null ? h.strengthScore.toFixed(2) : t.none}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
  minWidth: '640px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.4rem 0.5rem',
  borderBottom: '2px solid #333',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};

const tagStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: '#999',
};
