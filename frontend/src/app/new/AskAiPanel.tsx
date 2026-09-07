'use client';

import { useEffect, useState } from 'react';
import { AiQuestion, PredictionLanguage, askQuestion, listQuestions, translateQuestion } from '@/lib/api';
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

function toApiLanguage(language: WizardLanguage): PredictionLanguage {
  return language === 'ta' ? 'TA' : 'EN';
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
  // language THIS question is asked (and answered) in, right here — and,
  // per user feedback, switching it also re-displays every earlier answer
  // in that language (see the translation cache below), not just new ones.
  const [askLanguage, setAskLanguage] = useState<WizardLanguage>(language);
  const t = labels[askLanguage];

  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AiQuestion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-asking the same question text in a different language is how a
  // "translated" view of an old answer is produced — there's no separate
  // translate-only endpoint, so this is a real (cached) AI call the first
  // time each entry is viewed in a given language, not on every toggle.
  const [translations, setTranslations] = useState<Record<string, Partial<Record<WizardLanguage, AiQuestion>>>>({});
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

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

  // Whenever the toggle changes (or new history arrives), fetch a
  // same-language version of every entry that isn't already in that
  // language — once per (entry, language), cached in `translations`.
  useEffect(() => {
    const targets = history.filter((entry) => {
      if (toWizardLanguage(entry.language) === askLanguage) return false;
      if (translations[entry.id]?.[askLanguage]) return false;
      return true;
    });
    if (targets.length === 0) return;

    setTranslatingIds((prev) => new Set([...prev, ...targets.map((e) => e.id)]));
    targets.forEach((entry) => {
      translateQuestion(jathakamId, entry.question, toApiLanguage(askLanguage))
        .then((translated) => {
          setTranslations((prev) => ({
            ...prev,
            [entry.id]: { ...prev[entry.id], [askLanguage]: translated },
          }));
        })
        .catch(() => {
          // Leave untranslated — the original-language answer still shows
          // as a fallback (see render below) rather than an error blocking
          // the whole list.
        })
        .finally(() => {
          setTranslatingIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.id);
            return next;
          });
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askLanguage, history]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setAsking(true);
    setError(null);
    try {
      const answer = await askQuestion(jathakamId, trimmed, toApiLanguage(askLanguage));
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
            const nativeMatch = toWizardLanguage(entry.language) === askLanguage;
            const displayEntry = nativeMatch ? entry : translations[entry.id]?.[askLanguage];
            const isTranslating = !nativeMatch && !displayEntry && translatingIds.has(entry.id);
            const shown = displayEntry ?? entry;

            return (
              <div key={entry.id} className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                <div className="flex items-start justify-between gap-space-xs">
                  <p className="font-title-md text-title-md text-primary">{shown.question}</p>
                  {shown.confidence && (
                    <span
                      className={`font-label-sm text-label-sm font-semibold flex-shrink-0 ${CONFIDENCE_COLOR[shown.confidence]}`}
                    >
                      {t.predictionConfidence[shown.confidence]}
                    </span>
                  )}
                </div>

                {isTranslating ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{t.askAiAsking}</p>
                ) : (
                  <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface leading-relaxed">
                    {shown.answer}
                  </p>
                )}

                <span className="font-label-sm text-label-sm text-outline">
                  {formatDateTime(entry.createdAt, askLanguage)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
