'use client';

import { useEffect, useState } from 'react';
import { FullReport, getReport, ReportSectionStatus } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
}

const STATUS_BADGE: Record<ReportSectionStatus, string> = {
  chart_data: 'text-secondary',
  ai_generated: 'text-secondary',
  ai_pending: 'text-on-secondary-fixed-variant',
  unavailable: 'text-outline',
};

// Phase 15's full report generator assembles the fixed 34-section
// structure (spec §28) as a table of contents — this renders it. Sections
// already covered by the panels above (rasi chart, houses, dasha, etc.) or
// by the AI panel just show their status here; there's nothing new to
// render for them since duplicating that content would just be noise.
export function ReportStructurePanel({ language, jathakamId }: Props) {
  const t = labels[language];
  const apiLanguage = language === 'ta' ? 'TA' : 'EN';
  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(jathakamId, apiLanguage)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    // Re-fetch when the display language changes so titles/status text stay
    // in sync; jathakamId never changes within this page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jathakamId, apiLanguage]);

  if (error) {
    return (
      <p className="text-error font-body-sm text-body-sm">
        {t.error}: {error}
      </p>
    );
  }

  if (!report) {
    return <p className="text-on-surface-variant font-body-sm text-body-sm">{t.loadingReport}</p>;
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <p className="font-body-sm text-body-sm text-on-surface-variant m-0">{t.reportStructureNote}</p>
      <ol className="m-0 pl-space-lg flex flex-col gap-space-2xs">
        {report.sections.map((section) => (
          <li key={section.id} className="font-body-sm text-body-sm text-on-surface">
            <span>{language === 'ta' ? section.title.ta : section.title.en}</span>{' '}
            <span className={`font-label-sm text-label-sm ${STATUS_BADGE[section.status]}`}>
              — {t.reportStatus[section.status]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
