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

// Percent of the current Mahadasha elapsed as of today — a real, derived
// figure (not fabricated) matching the progress bar in the Stitch mockup.
function percentElapsed(period: { startDate: string; endDate: string } | null): number | null {
  if (!period) return null;
  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  const now = Date.now();
  if (end <= start) return null;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

export function DashaPanel({ language, dasha }: Props) {
  const t = labels[language];
  const progress = percentElapsed(dasha.mahadasha.current);

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="p-space-sm rounded-lg bg-surface-container-low">
        <div className="flex items-center justify-between mb-space-2xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t.currentDashaLabel}</span>
          {progress !== null && <span className="font-label-lg text-label-lg font-bold text-secondary">{Math.round(progress)}%</span>}
        </div>
        <DashaRow label={t.mahadashaLabel} period={dasha.mahadasha.current} language={language} strong />
        <DashaRow label={t.antardashaLabel} period={dasha.antardasha.current} language={language} indent={1} />
        <DashaRow label={t.pratyantardashaLabel} period={dasha.pratyantardasha.current} language={language} indent={2} />

        {progress !== null && (
          <div className="w-full h-2.5 rounded-full bg-surface-container-highest mt-space-sm overflow-hidden">
            <div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-space-xs font-body-sm text-body-sm">
        <div className="p-space-xs rounded-lg bg-surface-container">
          <div className="font-label-sm text-label-sm text-on-surface-variant">{t.previousMahadashaLabel}</div>
          <div className="font-title-md text-title-md text-primary mt-space-3xs">
            {dasha.mahadasha.previous ? grahaName(dasha.mahadasha.previous.graha, language) : t.none}
          </div>
        </div>
        <div className="p-space-xs rounded-lg bg-surface-container">
          <div className="font-label-sm text-label-sm text-on-surface-variant">{t.nextMahadashaLabel}</div>
          <div className="font-title-md text-title-md text-primary mt-space-3xs">
            {dasha.mahadasha.next ? grahaName(dasha.mahadasha.next.graha, language) : t.none}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-title-md text-title-md text-primary mb-space-xs">{t.mahadashaTimelineTitle}</h4>
        <div className="overflow-x-auto -mx-space-sm px-space-sm">
          <table className="w-full text-left font-body-sm text-body-sm min-w-[320px]">
            <tbody>
              {dasha.mahadashaList.map((m, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40'}>
                  <td className="py-space-xs px-space-xs font-title-md text-primary font-semibold">
                    {grahaName(m.graha, language)}
                  </td>
                  <td className="py-space-xs px-space-xs text-on-surface-variant">
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
    <div
      className={`${strong ? 'font-title-md text-title-md text-primary font-bold' : 'font-body-sm text-body-sm text-on-surface-variant'}`}
      style={{ marginLeft: `${indent}rem` }}
    >
      <span className={strong ? '' : 'font-semibold text-on-surface'}>{label}:</span>{' '}
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
