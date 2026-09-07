'use client';

import { DoshaEntry } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  doshas: DoshaEntry[];
}

const SEVERITY_BADGE: Record<DoshaEntry['severity'], string> = {
  STRONG: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  MODERATE: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  LOW: 'bg-surface-container text-on-surface-variant',
};

export function DoshaPanel({ language, doshas }: Props) {
  const t = labels[language];

  return (
    <div className="flex flex-col gap-space-sm">
      <p className="font-body-sm text-body-sm text-on-surface-variant m-0">{t.doshaIntro}</p>

      {doshas.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t.noDoshasFound}</p>
      ) : (
        doshas.map((dosha) => (
          <div key={dosha.id} className="p-space-sm rounded-lg bg-surface-container-low">
            <div className="flex items-start justify-between gap-space-xs">
              <strong className="font-title-md text-title-md text-primary">{dosha.name}</strong>
              <span
                className={`px-space-xs py-space-3xs rounded-full font-label-sm text-label-sm flex-shrink-0 ${SEVERITY_BADGE[dosha.severity]}`}
              >
                {t.doshaSeverity[dosha.severity]}
              </span>
            </div>
            {dosha.description && (
              <p className="font-body-sm text-body-sm text-on-surface mt-space-xs leading-relaxed">
                {language === 'ta' ? dosha.description.ta : dosha.description.en}
              </p>
            )}
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
              <strong>{t.doshaRuleLabel}:</strong> {dosha.ruleTriggered}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
