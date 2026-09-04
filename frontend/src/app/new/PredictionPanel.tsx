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
  HIGH: '#2e7d32',
  MEDIUM: '#a15c00',
  LOW: '#a15c00',
};

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

  const grahaLabel = (graha: string) => (language === 'ta' ? glossary?.grahaNames[graha as Graha]?.ta : glossary?.grahaNames[graha as Graha]?.en) ?? graha;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={periodBoxStyle}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.palanPeriodLabel}</label>
        <select
          value={periodMode}
          onChange={(e) => setPeriodMode(e.target.value as PalanPeriodMode)}
          style={selectStyle}
        >
          {PALAN_PERIOD_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t.palanPeriodMode[mode]}
            </option>
          ))}
        </select>

        {periodMode === 'NEXT_YEARS' && (
          <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {t.palanPeriodYearsLabel}
            <input
              type="number"
              min={1}
              max={50}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              style={{ ...selectStyle, width: '5rem' }}
            />
          </label>
        )}

        {periodMode === 'UNTIL_DASHA' && (
          <>
            <label style={{ fontSize: '0.8rem' }}>
              {t.palanPeriodUntilMahadashaLabel}
              <select
                value={untilMahadashaGraha}
                onChange={(e) => {
                  setUntilMahadashaGraha(e.target.value as Graha);
                  setUntilAntardashaGraha('');
                }}
                style={selectStyle}
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
              <label style={{ fontSize: '0.8rem' }}>
                {t.palanPeriodUntilAntardashaLabel}
                <select
                  value={untilAntardashaGraha}
                  onChange={(e) => setUntilAntardashaGraha(e.target.value as Graha)}
                  style={selectStyle}
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
          <div key={section} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
              <strong>{t.predictionSectionNames[section]}</strong>
              {prediction && (
                <span style={{ fontSize: '0.75rem', color: CONFIDENCE_COLOR[prediction.confidence], fontWeight: 600 }}>
                  {t.predictionConfidenceLabel}: {t.predictionConfidence[prediction.confidence]}
                </span>
              )}
            </div>

            {prediction && (
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#333', margin: '0.5rem 0' }}>
                {prediction.text}
              </p>
            )}

            {error && (
              <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                {t.error}: {error}
              </p>
            )}

            {isLoading && <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0' }}>{t.generating}</p>}

            <button
              type="button"
              style={buttonStyle}
              disabled={isLoading}
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

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.6rem 0.75rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  borderRadius: '6px',
  border: '1px solid #111',
  background: 'white',
  color: '#111',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const periodBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.6rem',
  border: '1px dashed #ccc',
  borderRadius: '4px',
  padding: '0.6rem 0.75rem',
  background: '#fafafa',
};

const selectStyle: React.CSSProperties = {
  marginLeft: '0.4rem',
  padding: '0.3rem 0.5rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
  fontSize: '0.85rem',
};
