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
    <div className="flex flex-col gap-space-sm">
      <p className="font-body-sm text-body-sm text-on-surface-variant m-0">{t.transitNote}</p>

      <div className="overflow-x-auto -mx-space-sm px-space-sm">
        <table className="w-full text-left font-body-sm text-body-sm min-w-[480px]">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              <th className="py-space-2xs px-space-xs rounded-l-lg whitespace-nowrap">{t.transitGrahaCol}</th>
              <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.transitSignCol}</th>
              <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.houseFromMoonCol}</th>
              <th className="py-space-2xs px-space-xs rounded-r-lg whitespace-nowrap">{t.houseFromLagnaCol}</th>
            </tr>
          </thead>
          <tbody>
            {transits.transits.map((tr, i) => (
              <tr key={tr.graha} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40'}>
                <td className="py-space-xs px-space-xs font-title-md text-primary font-semibold">
                  {grahaName(tr.graha, language)}
                  {tr.retrograde && <span className="text-outline font-body-sm"> ({language === 'ta' ? 'வ' : 'R'})</span>}
                </td>
                <td className="py-space-xs px-space-xs">{language === 'ta' ? tr.signName.ta : tr.signName.en}</td>
                <td className="py-space-xs px-space-xs">{tr.houseFromMoon}</td>
                <td className="py-space-xs px-space-xs">{tr.houseFromLagna}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-surface-container-low p-space-sm font-body-sm text-body-sm flex flex-col gap-space-2xs">
        <div>
          <strong className="text-primary">{t.sadeSatiLabel}:</strong>{' '}
          {transits.sadeSati.active && transits.sadeSati.phase
            ? t.sadeSatiPhase[transits.sadeSati.phase]
            : t.sadeSatiInactive}
        </div>
        <div>
          <strong className="text-primary">{t.ashtamaShaniLabel}:</strong>{' '}
          {transits.ashtamaShani ? t.yesLabel : t.noLabel}
        </div>
        <div>
          <strong className="text-primary">{t.janmaShaniLabel}:</strong> {transits.janmaShani ? t.yesLabel : t.noLabel}
        </div>
      </div>
    </div>
  );
}
