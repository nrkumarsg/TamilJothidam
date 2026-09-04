'use client';

import { useEffect, useState } from 'react';
import { FullReport, getReport, ReportSectionStatus } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
}

const STATUS_COLOR: Record<ReportSectionStatus, string> = {
  chart_data: '#2e7d32',
  ai_generated: '#2e7d32',
  ai_pending: '#a15c00',
  unavailable: '#999',
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
      <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>
        {t.error}: {error}
      </p>
    );
  }

  if (!report) {
    return <p style={{ color: '#666', fontSize: '0.85rem' }}>{t.loadingReport}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{t.reportStructureNote}</p>
      <ol style={{ margin: 0, paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {report.sections.map((section) => (
          <li key={section.id} style={{ fontSize: '0.85rem' }}>
            <span>{language === 'ta' ? section.title.ta : section.title.en}</span>{' '}
            <span style={{ color: STATUS_COLOR[section.status], fontSize: '0.75rem' }}>
              — {t.reportStatus[section.status]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
