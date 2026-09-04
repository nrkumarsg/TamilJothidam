'use client';

import { YogaEntry } from '@/lib/api';
import { GRAHA_ABBREV } from '@/components/chart/graha-labels';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  yogas: YogaEntry[];
}

function grahaName(graha: string, language: WizardLanguage): string {
  return GRAHA_ABBREV[graha]?.[language] ?? graha;
}

const STRENGTH_COLOR: Record<YogaEntry['strength'], string> = {
  STRONG: '#2e7d32',
  MODERATE: '#a15c00',
  LOW: '#666',
};

export function YogaPanel({ language, yogas }: Props) {
  const t = labels[language];

  if (yogas.length === 0) {
    return <p style={{ fontSize: '0.85rem', color: '#666' }}>{t.noYogasFound}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {yogas.map((yoga) => (
        <div key={yoga.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{yoga.name}</strong>
            <span style={{ fontSize: '0.75rem', color: STRENGTH_COLOR[yoga.strength], fontWeight: 600 }}>
              {t.yogaStrength[yoga.strength]}
            </span>
          </div>
          {yoga.description && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#444' }}>
              {language === 'ta' ? yoga.description.ta : yoga.description.en}
            </p>
          )}
          <div style={{ fontSize: '0.78rem', color: '#666' }}>
            <strong>{t.yogaPlanetsLabel}:</strong>{' '}
            {yoga.participatingPlanets.map((g) => grahaName(g, language)).join(', ')}
            {' · '}
            <strong>{t.yogaHousesLabel}:</strong> {yoga.participatingHouses.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.6rem 0.75rem',
};
