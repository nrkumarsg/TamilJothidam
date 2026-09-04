'use client';

import { DoshaEntry } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  doshas: DoshaEntry[];
}

const SEVERITY_COLOR: Record<DoshaEntry['severity'], string> = {
  STRONG: '#a15c00',
  MODERATE: '#a15c00',
  LOW: '#666',
};

export function DoshaPanel({ language, doshas }: Props) {
  const t = labels[language];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{t.doshaIntro}</p>

      {doshas.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: '#666' }}>{t.noDoshasFound}</p>
      ) : (
        doshas.map((dosha) => (
          <div key={dosha.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{dosha.name}</strong>
              <span style={{ fontSize: '0.75rem', color: SEVERITY_COLOR[dosha.severity], fontWeight: 600 }}>
                {t.doshaSeverity[dosha.severity]}
              </span>
            </div>
            {dosha.description && (
              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#444' }}>
                {language === 'ta' ? dosha.description.ta : dosha.description.en}
              </p>
            )}
            <div style={{ fontSize: '0.78rem', color: '#666' }}>
              <strong>{t.doshaRuleLabel}:</strong> {dosha.ruleTriggered}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.6rem 0.75rem',
};
