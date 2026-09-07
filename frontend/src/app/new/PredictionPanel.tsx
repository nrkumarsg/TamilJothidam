'use client';

import { useEffect, useState } from 'react';
import {
  DashaPeriod,
  Glossary,
  Graha,
  PalanPeriodMode,
  PalanPeriodOptions,
  PALAN_PERIOD_MODES,
  generatePrediction,
  getGlossary,
  Prediction,
  PREDICTION_SECTIONS,
  PredictionSection,
} from '@/lib/api';
import { labels, WizardLanguage } from './labels';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
  initialPredictions: Prediction[];
  mahadashaList: (DashaPeriod & { antardashas: DashaPeriod[] })[];
}

const CONFIDENCE_COLOR: Record<Prediction['confidence'], string> = {
  HIGH: 'text-secondary',
  MEDIUM: 'text-on-secondary-fixed-variant',
  LOW: 'text-on-secondary-fixed-variant',
};

const selectClass =
  'ml-space-2xs px-space-xs py-space-3xs rounded-lg border border-outline-variant bg-surface-container-lowest font-label-sm text-label-sm text-primary focus:outline-none';

// AI interpretation is opt-in per section (spec §25/§33, Phase 13) — unlike
// the deterministic panels above, each generation is a real API call with
// real cost, so nothing here auto-generates on page load.
//
// The period selector (Phase 15) lets the user pick how far ahead the AI
// should reason before generating — a request the AI never decides on its
// own. It applies to whichever section the user clicks Generate/Regenerate
// on next; see backend/src/ai/palan-period.types.ts for what each mode
// actually changes in the prompt.
export function PredictionPanel({ language, jathakamId, initialPredictions, mahadashaList }: Props) {
  const t = labels[language];
  const apiLanguage = language === 'ta' ? 'TA' : 'EN';

  const [predictions, setPredictions] = useState<Record<string, Prediction>>(() =>
    Object.fromEntries(initialPredictions.map((p) => [p.section, p])),
  );
  const [loadingSection, setLoadingSection] = useState<PredictionSection | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const [periodMode, setPeriodMode] = useState<PalanPeriodMode>('CURRENT');
  const [years, setYears] = useState(5);
  const [untilMahadashaGraha, setUntilMahadashaGraha] = useState<Graha | ''>('');
  const [untilAntardashaGraha, setUntilAntardashaGraha] = useState<Graha | ''>('');

  useEffect(() => {
    getGlossary()
      .then(setGlossary)
      .catch(() => setGlossary(null));
  }, []);

  const selectedMahadasha = mahadashaList.find((m) => m.graha === untilMahadashaGraha);

  function currentPalanPeriod(): PalanPeriodOptions | undefined {
    if (periodMode === 'CURRENT') return undefined;
    if (periodMode === 'NEXT_YEARS') return { mode: 'NEXT_YEARS', years };
    if (periodMode === 'WHOLE_LIFE') return { mode: 'WHOLE_LIFE' };
    if (!untilMahadashaGraha) return undefined;
    return {
      mode: 'UNTIL_DASHA',
      untilMahadashaGraha,
      untilAntardashaGraha: untilAntardashaGraha || undefined,
    };
  }

  async function handleGenerate(section: PredictionSection, regenerate: boolean) {
    setLoadingSection(section);
    setErrors((prev) => ({ ...prev, [section]: '' }));
    try {
      const prediction = await generatePrediction(jathakamId, section, apiLanguage, regenerate, currentPalanPeriod());
      setPredictions((prev) => ({ ...prev, [section]: prediction }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [section]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoadingSection(null);
    }
  }

  const grahaLabel = (graha: string) =>
    (language === 'ta' ? glossary?.grahaNames[graha as Graha]?.ta : glossary?.grahaNames[graha as Graha]?.en) ?? graha;

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-wrap items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low">
        <label className="font-label-md text-label-md text-primary font-semibold">{t.palanPeriodLabel}</label>
        <select
          className={selectClass}
          value={periodMode}
          onChange={(e) => setPeriodMode(e.target.value as PalanPeriodMode)}
        >
          {PALAN_PERIOD_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t.palanPeriodMode[mode]}
            </option>
          ))}
        </select>

        {periodMode === 'NEXT_YEARS' && (
          <label className="font-body-sm text-body-sm flex items-center gap-space-2xs">
            {t.palanPeriodYearsLabel}
            <input
              className={`${selectClass} w-20`}
              max={50}
              min={1}
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </label>
        )}

        {periodMode === 'UNTIL_DASHA' && (
          <>
            <label className="font-body-sm text-body-sm">
              {t.palanPeriodUntilMahadashaLabel}
              <select
                className={selectClass}
                value={untilMahadashaGraha}
                onChange={(e) => {
                  setUntilMahadashaGraha(e.target.value as Graha);
                  setUntilAntardashaGraha('');
                }}
              >
                <option value="">—</option>
                {mahadashaList.map((m) => (
                  <option key={m.graha} value={m.graha}>
                    {grahaLabel(m.graha)} ({new Date(m.startDate).getFullYear()}–{new Date(m.endDate).getFullYear()})
                  </option>
                ))}
              </select>
            </label>

            {selectedMahadasha && (
              <label className="font-body-sm text-body-sm">
                {t.palanPeriodUntilAntardashaLabel}
                <select
                  className={selectClass}
                  value={untilAntardashaGraha}
                  onChange={(e) => setUntilAntardashaGraha(e.target.value as Graha)}
                >
                  <option value="">{t.palanPeriodUntilAntardashaAny}</option>
                  {selectedMahadasha.antardashas.map((a) => (
                    <option key={a.graha} value={a.graha}>
                      {grahaLabel(a.graha)} ({new Date(a.startDate).getFullYear()}–{new Date(a.endDate).getFullYear()})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
      </div>

      {PREDICTION_SECTIONS.map((section) => {
        const prediction = predictions[section];
        const isLoading = loadingSection === section;
        const error = errors[section];

        return (
          <div key={section} className="p-space-sm rounded-lg bg-surface-container-low">
            <div className="flex justify-between items-baseline gap-space-xs">
              <strong className="font-title-md text-title-md text-primary">{t.predictionSectionNames[section]}</strong>
              {prediction && (
                <span className={`font-label-sm text-label-sm font-semibold flex-shrink-0 ${CONFIDENCE_COLOR[prediction.confidence]}`}>
                  {t.predictionConfidenceLabel}: {t.predictionConfidence[prediction.confidence]}
                </span>
              )}
            </div>

            {prediction && (
              <p className="whitespace-pre-wrap font-body-md text-body-md text-on-surface my-space-xs leading-relaxed">
                {prediction.text}
              </p>
            )}

            {error && (
              <p className="text-error font-body-sm text-body-sm my-space-2xs">
                {t.error}: {error}
              </p>
            )}

            {isLoading && <p className="text-on-surface-variant font-body-sm text-body-sm my-space-2xs">{t.generating}</p>}

            <button
              className="mt-space-2xs px-space-md py-space-2xs rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
              disabled={isLoading}
              type="button"
              onClick={() => handleGenerate(section, Boolean(prediction))}
            >
              {prediction ? t.regenerateButton : t.generateButton}
            </button>
          </div>
        );
      })}
    </div>
  );
}
