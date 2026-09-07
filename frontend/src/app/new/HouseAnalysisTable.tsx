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
    <div className="overflow-x-auto -mx-space-sm px-space-sm">
      <table className="w-full text-left font-body-sm text-body-sm min-w-[640px]">
        <thead>
          <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
            <th className="py-space-2xs px-space-xs rounded-l-lg whitespace-nowrap">{t.houseCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.signCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.significationCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.lordCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.occupantsCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.aspectsCol}</th>
            <th className="py-space-2xs px-space-xs whitespace-nowrap">{t.influenceCol}</th>
            <th className="py-space-2xs px-space-xs rounded-r-lg whitespace-nowrap">{t.strengthCol}</th>
          </tr>
        </thead>
        <tbody>
          {houseAnalysis.map((h, i) => (
            <tr key={h.houseNo} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40'}>
              <td className="py-space-xs px-space-xs align-top font-title-md text-primary font-semibold">
                {h.houseNo}
                {h.conjunction && <div className="font-label-sm text-[10px] text-outline">{t.conjunctionTag}</div>}
              </td>
              <td className="py-space-xs px-space-xs align-top">{language === 'ta' ? h.signName.ta : h.signName.en}</td>
              <td className="py-space-xs px-space-xs align-top">
                {language === 'ta' ? h.signification.ta : h.signification.en}
              </td>
              <td className="py-space-xs px-space-xs align-top">
                {grahaLabel(h.lord, language)} (H{h.lordHouse})
              </td>
              <td className="py-space-xs px-space-xs align-top">{grahaList(h.occupants, language, t.none)}</td>
              <td className="py-space-xs px-space-xs align-top">{grahaList(h.aspectingGrahas, language, t.none)}</td>
              <td className="py-space-xs px-space-xs align-top">
                {h.beneficInfluences.length > 0 && (
                  <div className="text-secondary">
                    {t.beneficShort}: {grahaList(h.beneficInfluences, language, t.none)}
                  </div>
                )}
                {h.maleficInfluences.length > 0 && (
                  <div className="text-error">
                    {t.maleficShort}: {grahaList(h.maleficInfluences, language, t.none)}
                  </div>
                )}
                {h.beneficInfluences.length === 0 && h.maleficInfluences.length === 0 && t.none}
              </td>
              <td className="py-space-xs px-space-xs align-top">
                {h.strengthScore !== null ? (
                  <span className="px-space-xs py-space-3xs rounded font-label-sm text-label-sm bg-surface-container-high text-primary font-semibold">
                    {h.strengthScore.toFixed(2)}
                  </span>
                ) : (
                  t.none
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
