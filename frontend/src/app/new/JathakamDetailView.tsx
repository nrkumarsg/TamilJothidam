'use client';

import { useEffect, useState } from 'react';
import { BirthTimeAccuracy, DashaSummary, JathakamSummary, TransitSummary, getDasha, getJathakam, getTransits } from '@/lib/api';
import { labels, WizardLanguage } from './labels';
import { SouthIndianChart } from '@/components/chart/SouthIndianChart';
import { HouseAnalysisTable } from './HouseAnalysisTable';
import { DashaPanel } from './DashaPanel';
import { TransitPanel } from './TransitPanel';
import { YogaPanel } from './YogaPanel';
import { DoshaPanel } from './DoshaPanel';
import { PredictionPanel } from './PredictionPanel';
import { ReportStructurePanel } from './ReportStructurePanel';
import { PdfDownloadButton } from './PdfDownloadButton';

interface Props {
  language: WizardLanguage;
  jathakamId: string;
  // Optional — only known when this is shown right after creation (the
  // wizard already has the form's answer) or when the caller separately
  // fetched the owning BirthProfile. Omit it entirely (e.g. a bare
  // "/jathakams/:id" view without an extra profile fetch) and the warning
  // simply doesn't render — it's a nice-to-have, not load-bearing data.
  timeAccuracy?: BirthTimeAccuracy;
  // Pre-fetched jathakam, so a caller that already has it (the create flow,
  // right after POST /jathakams) doesn't force a redundant GET.
  initialJathakam?: JathakamSummary;
}

// Shared "here's your computed chart" view (spec §39's dashboard originally
// only wired this up inline right after creation — see page.tsx's history).
// Used by both the create wizard's success screen and the standalone
// "/jathakams/:id" view page, so returning to a chart you made earlier
// shows exactly the same thing creating it just now would.
export function JathakamDetailView({ language, jathakamId, timeAccuracy, initialJathakam }: Props) {
  const t = labels[language];

  const [jathakam, setJathakam] = useState<JathakamSummary | null>(initialJathakam ?? null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [loadingChart, setLoadingChart] = useState(!initialJathakam);
  const [dasha, setDasha] = useState<DashaSummary | null>(null);
  const [dashaError, setDashaError] = useState<string | null>(null);
  const [transits, setTransits] = useState<TransitSummary | null>(null);
  const [transitsError, setTransitsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!initialJathakam) {
        setLoadingChart(true);
        try {
          const chart = await getJathakam(jathakamId);
          if (!cancelled) setJathakam(chart);
        } catch (err) {
          if (!cancelled) setChartError(err instanceof Error ? err.message : String(err));
        } finally {
          if (!cancelled) setLoadingChart(false);
        }
      }

      try {
        const dashaSummary = await getDasha(jathakamId);
        if (!cancelled) setDasha(dashaSummary);
      } catch (err) {
        if (!cancelled) setDashaError(err instanceof Error ? err.message : String(err));
      }

      try {
        const transitSummary = await getTransits(jathakamId);
        if (!cancelled) setTransits(transitSummary);
      } catch (err) {
        if (!cancelled) setTransitsError(err instanceof Error ? err.message : String(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jathakamId]);

  if (loadingChart) return <p style={{ color: '#666' }}>{t.loadingChart}</p>;

  if (chartError) {
    return (
      <p style={{ color: '#c0392b' }}>
        {t.error}: {chartError}
      </p>
    );
  }

  if (!jathakam || !jathakam.lagna || !jathakam.rasi) return null;

  const showAccuracyWarning = timeAccuracy === 'UNKNOWN' || timeAccuracy === 'WITHIN_30_MIN';
  const planetFlags = Object.fromEntries(
    jathakam.planets.map((p) => [p.graha, { retrograde: p.retrograde, combust: p.combust }]),
  );

  return (
    <div style={boxStyle}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t.resultsTitle}</h2>

      {showAccuracyWarning && <p style={warningStyle}>{t.missingBirthTimeWarning}</p>}

      <h3 style={h3Style}>{t.rasiChartTitle}</h3>
      <SouthIndianChart
        lagnaSignIndex={jathakam.lagna.signIndex}
        houses={jathakam.houses}
        planetFlags={planetFlags}
        language={language}
        centerLabel={language === 'ta' ? 'ராசி' : 'Rasi'}
      />

      {jathakam.navamsa && (
        <>
          <h3 style={h3Style}>{t.navamsaChartTitle}</h3>
          <SouthIndianChart
            lagnaSignIndex={jathakam.navamsa.lagnaSignIndex}
            houses={jathakam.navamsa.houses}
            planetFlags={planetFlags}
            language={language}
            centerLabel={language === 'ta' ? 'நவாம்சம்' : 'Navamsa'}
          />
        </>
      )}

      <div>
        <strong>{t.lagnaLabel}:</strong> {language === 'ta' ? jathakam.lagna.signName.ta : jathakam.lagna.signName.en} (
        {jathakam.lagna.degreeInSign.toFixed(2)}° {t.degreeLabel})
      </div>
      <div>
        <strong>{t.rasiLabel}:</strong> {language === 'ta' ? jathakam.rasi.signName.ta : jathakam.rasi.signName.en}
      </div>
      <div>
        <strong>{t.nakshatraLabel}:</strong>{' '}
        {language === 'ta' ? jathakam.rasi.nakshatraName.ta : jathakam.rasi.nakshatraName.en} — {t.padaLabel}{' '}
        {jathakam.rasi.pada}
      </div>

      <h3 style={h3Style}>{t.houseAnalysisTitle}</h3>
      <HouseAnalysisTable language={language} houseAnalysis={jathakam.houseAnalysis} />

      <h3 style={h3Style}>{t.yogaTitle}</h3>
      <YogaPanel language={language} yogas={jathakam.yogas} />

      <h3 style={h3Style}>{t.doshaTitle}</h3>
      <DoshaPanel language={language} doshas={jathakam.doshas} />

      <h3 style={h3Style}>{t.dashaTitle}</h3>
      {dashaError && (
        <p style={{ color: '#c0392b' }}>
          {t.error}: {dashaError}
        </p>
      )}
      {dasha && <DashaPanel language={language} dasha={dasha} />}

      <h3 style={h3Style}>{t.transitTitle}</h3>
      {transitsError && (
        <p style={{ color: '#c0392b' }}>
          {t.error}: {transitsError}
        </p>
      )}
      {transits && <TransitPanel language={language} transits={transits} />}

      <h3 style={h3Style}>{t.predictionTitle}</h3>
      <PredictionPanel
        language={language}
        jathakamId={jathakam.id}
        initialPredictions={[]}
        mahadashaList={dasha?.mahadashaList ?? []}
      />

      <h3 style={h3Style}>{t.reportStructureTitle}</h3>
      <ReportStructurePanel language={language} jathakamId={jathakam.id} />

      <h3 style={h3Style}>{t.pdfTitle}</h3>
      <PdfDownloadButton language={language} jathakamId={jathakam.id} />

      <p style={{ ...warningStyle, color: '#666' }}>{t.fullChartNote}</p>
    </div>
  );
}

const h3Style: React.CSSProperties = { margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' };

const boxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const warningStyle: React.CSSProperties = {
  color: '#a15c00',
  background: '#fff7e6',
  padding: '0.5rem 0.75rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  margin: 0,
};
