'use client';

import { useEffect, useState } from 'react';
import { AiQuestion, PredictionLanguage, askQuestion, listQuestions } from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  // Initial language for the box only — the page's overall display
  // language. The box then carries its own தமிழ்/Eng toggle so a question
  // can be asked (and answered) in either language regardless of what the
  // rest of the page is currently showing.
  language: WizardLanguage;
  jathakamId: string;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: 'text-secondary',
  MEDIUM: 'text-on-secondary-fixed-variant',
  LOW: 'text-on-secondary-fixed-variant',
};

function toWizardLanguage(language: PredictionLanguage): WizardLanguage {
  return language === 'TA' ? 'ta' : 'en';
}

function formatDateTime(iso: string, language: WizardLanguage): string {
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

// Free-text Q&A tied to one jathakam — "when can I go abroad?", "when will
// I get married?", "will my spouse work?" — anything that doesn't fit the
// 34 fixed report sections above. Every question is its own AI call (no
// caching, unlike the fixed sections) and the full thread for this chart
// is shown back so a user can revisit earlier answers.
export function AskAiPanel({ language, jathakamId }: Props) {
  // Independent from the page-level language: the user picks which
  // language THIS question is asked (and answered) in, right here.
  const [askLanguage, setAskLanguage] = useState<WizardLanguage>(language);
  const t = labels[askLanguage];

  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AiQuestion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listQuestions(jathakamId)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jathakamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setError(null);
    try {
      const answer = await askQuestion(jathakamId, trimmed, askLanguage === 'ta' ? 'TA' : 'EN');
      setHistory((prev) => [answer, ...prev]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-space-xs">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{t.askAiLanguageLabel}</span>
        <div className="inline-flex items-center p-space-3xs rounded-full bg-surface-container">
          <button
            className={`px-space-sm py-space-3xs rounded-full font-label-sm text-label-sm ${
              askLanguage === 'ta' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
            type="button"
            onClick={() => setAskLanguage('ta')}
          >
            {labels.ta.tamil}
          </button>
          <button
            className={`px-space-sm py-space-3xs rounded-full font-label-sm text-label-sm ${
              askLanguage === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
            type="button"
            onClick={() => setAskLanguage('en')}
          >
            {labels.en.english}
          </button>
        </div>
      </div>

      <form className="flex flex-col gap-space-xs" onSubmit={handleSubmit}>
        <textarea
          className="w-full p-space-sm rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={asking}
          placeholder={t.askAiPlaceholder}
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="self-end px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
          disabled={asking || question.trim().length < 3}
          type="submit"
        >
          {asking ? t.askAiAsking : t.askAiSubmit}
        </button>
      </form>

      {error && (
        <p className="text-error font-body-sm text-body-sm">
          {t.error}: {error}
        </p>
      )}

      {!loadingHistory && history.length === 0 && !error && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t.askAiEmpty}</p>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-space-sm">
          <h4 className="font-title-md text-title-md text-primary">{t.askAiHistoryTitle}</h4>
          {history.map((entry) => {
            // Each entry renders in the language it was actually asked/
            // answered in — not the box's current toggle state — so past
            // Tamil questions keep their Tamil confidence label even while
            // the box is set to English for the next question.
            const entryLang = toWizardLanguage(entry.language);
            const entryLabels = labels[entryLang];
            return (
              <div key={entry.id} className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                <div className="flex items-start justify-between gap-space-xs">
                  <p className="font-title-md text-title-md text-primary">{entry.question}</p>
                  {entry.confidence && (
                    <span
                      className={`font-label-sm text-label-sm font-semibold flex-shrink-0 ${CONFIDENCE_COLOR[entry.confidence]}`}
                    >
                      {entryLabels.predictionConfidence[entry.confidence]}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface leading-relaxed">
                  {entry.answer}
                </p>
                <span className="font-label-sm text-label-sm text-outline">
                  {formatDateTime(entry.createdAt, entryLang)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
