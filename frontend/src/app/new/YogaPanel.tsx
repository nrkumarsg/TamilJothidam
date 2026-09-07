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

const STRENGTH_BADGE: Record<YogaEntry['strength'], string> = {
  STRONG: 'bg-secondary-container text-on-secondary-container',
  MODERATE: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  LOW: 'bg-surface-container text-on-surface-variant',
};

export function YogaPanel({ language, yogas }: Props) {
  const t = labels[language];

  if (yogas.length === 0) {
    return <p className="font-body-sm text-body-sm text-on-surface-variant">{t.noYogasFound}</p>;
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {yogas.map((yoga) => (
        <div key={yoga.id} className="p-space-sm rounded-lg bg-surface-container-low">
          <div className="flex items-start justify-between gap-space-xs">
            <strong className="font-title-md text-title-md text-primary">{yoga.name}</strong>
            <span
              className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm flex-shrink-0 ${STRENGTH_BADGE[yoga.strength]}`}
            >
              {t.yogaStrength[yoga.strength]}
            </span>
          </div>
          {yoga.description && (
            <p className="font-body-sm text-body-sm text-on-surface mt-space-xs leading-relaxed">
              {language === 'ta' ? yoga.description.ta : yoga.description.en}
            </p>
          )}
          <div className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
            <strong>{t.yogaPlanetsLabel}:</strong> {yoga.participatingPlanets.map((g) => grahaName(g, language)).join(', ')}
            {' · '}
            <strong>{t.yogaHousesLabel}:</strong> {yoga.participatingHouses.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}
