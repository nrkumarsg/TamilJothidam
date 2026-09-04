'use client';

import { useState } from 'react';
import { generatePdfReport, pdfDownloadUrl } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
}

// PDF generation is a real headless-browser render on the backend (Phase
// 16) — opt-in like the AI panel, not auto-generated. Generating and
// downloading are two steps (POST then GET) so the browser's native
// download flow handles the file, rather than us buffering it in JS.
export function PdfDownloadButton({ language, jathakamId }: Props) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>{t.pdfNote}</p>
      {error && (
        <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: 0 }}>
          {t.error}: {error}
        </p>
      )}
      {generating && <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>{t.pdfGenerating}</p>}
      <button type="button" style={buttonStyle} disabled={generating} onClick={handleDownload}>
        {t.pdfDownloadButton}
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: '1px solid #111',
  background: '#111',
  color: 'white',
  cursor: 'pointer',
  fontSize: '0.85rem',
  alignSelf: 'flex-start',
};
