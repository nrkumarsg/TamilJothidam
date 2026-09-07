'use client';

import { useState } from 'react';
import { generatePdfReport, pdfDownloadUrl } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
  // 'icon' renders a compact round button for the header banner (matching
  // the Stitch mockup's header download action); 'button' (default) renders
  // the full labelled button used in the report card.
  variant?: 'button' | 'icon';
}

// PDF generation is a real headless-browser render on the backend (Phase
// 16) — opt-in like the AI panel, not auto-generated. Generating and
// downloading are two steps (POST then GET) so the browser's native
// download flow handles the file, rather than us buffering it in JS.
export function PdfDownloadButton({ language, jathakamId, variant = 'button' }: Props) {
  const t = labels[language];
  const apiLanguage = language === 'ta' ? 'TA' : 'EN';
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setGenerating(true);
    setError(null);
    try {
      await generatePdfReport(jathakamId, apiLanguage);
      window.open(pdfDownloadUrl(jathakamId, apiLanguage), '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  if (variant === 'icon') {
    return (
      <button
        aria-label={t.downloadPdfAction}
        className="flex-shrink-0 flex items-center gap-space-2xs px-space-sm py-space-xs rounded-lg bg-primary-container text-on-primary shadow-sm active:scale-95 transition-transform disabled:opacity-60"
        disabled={generating}
        title={t.downloadPdfAction}
        type="button"
        onClick={handleDownload}
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        <span className="font-label-md text-label-md hidden sm:inline">{t.downloadPdfAction}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-space-xs items-start">
      <p className="font-body-sm text-body-sm text-on-surface-variant m-0">{t.pdfNote}</p>
      {error && (
        <p className="text-error font-body-sm text-body-sm m-0">
          {t.error}: {error}
        </p>
      )}
      {generating && <p className="text-on-surface-variant font-body-sm text-body-sm m-0">{t.pdfGenerating}</p>}
      <button
        className="px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
        disabled={generating}
        type="button"
        onClick={handleDownload}
      >
        {t.pdfDownloadButton}
      </button>
    </div>
  );
}
