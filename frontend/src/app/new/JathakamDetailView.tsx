'use client';

import { useEffect, useState } from 'react';
import { BirthTimeAccuracy, DashaSummary, JathakamSummary, TransitSummary, getDasha, getJathakam, getTransits } from '@/lib/api';
import { labels, WizardLanguage } from './labels';
import { SouthIndianChart } from '@/components/chart/SouthIndianChart';
import { Card } from '@/components/ui/Card';
import { HouseAnalysisTable } from './HouseAnalysisTable';
import { DashaPanel } from './DashaPanel';
import { TransitPanel } from './TransitPanel';
import { YogaPanel } from './YogaPanel';
import { DoshaPanel } from './DoshaPanel';
import { PredictionPanel } from './PredictionPanel';
import { AskAiPanel } from './AskAiPanel';
import { ReportStructurePanel } from './ReportStructurePanel';
import { PdfDownloadButton } from './PdfDownloadButton';

export interface ChartHeaderInfo {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName: string;
}

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
  // Name/birth details for the banner header. Omit and the banner falls
  // back to a generic title with no birth-details line.
  profile?: ChartHeaderInfo;
}

type Tab = 'overview' | 'navamsa' | 'houses' | 'dasha' | 'transit' | 'yogas' | 'ai';

function formatDate(iso: string, language: WizardLanguage): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Shared "here's your computed chart" view (spec §39's dashboard originally
// only wired this up inline right after creation — see page.tsx's history).
// Used by both the create wizard's success screen and the standalone
// "/jathakams/:id" view page, so returning to a chart you made earlier
// shows exactly the same thing creating it just now would.
export function JathakamDetailView({ language, jathakamId, timeAccuracy, initialJathakam, profile }: Props) {
  const t = labels[language];

  const [jathakam, setJathakam] = useState<JathakamSummary | null>(initialJathakam ?? null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [loadingChart, setLoadingChart] = useState(!initialJathakam);
  const [dasha, setDasha] = useState<DashaSummary | null>(null);
  const [dashaError, setDashaError] = useState<string | null>(null);
  const [transits, setTransits] = useState<TransitSummary | null>(null);
  const [transitsError, setTransitsError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

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

  if (loadingChart) return <p className="p-space-md text-on-surface-variant font-body-md text-body-md">{t.loadingChart}</p>;

  if (chartError) {
    return (
      <p className="p-space-md text-error font-body-md text-body-md">
        {t.error}: {chartError}
      </p>
    );
  }

  if (!jathakam || !jathakam.lagna || !jathakam.rasi) return null;

  const showAccuracyWarning = timeAccuracy === 'UNKNOWN' || timeAccuracy === 'WITHIN_30_MIN';
  const planetFlags = Object.fromEntries(
    jathakam.planets.map((p) => [p.graha, { retrograde: p.retrograde, combust: p.combust }]),
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t.overviewTab },
    { key: 'navamsa', label: t.navamsaChartTitle },
    { key: 'houses', label: t.housesTab },
    { key: 'dasha', label: t.dashaTitle },
    { key: 'transit', label: t.transitTitle },
    { key: 'yogas', label: t.yogasTab },
    { key: 'ai', label: t.aiTab },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Banner */}
      <div className="relative w-full px-margin-mobile pt-space-xs pb-space-md bg-surface-container-low shadow-sm">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-2xs">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">
                {t.chartDetailsTitle}
              </span>
            </div>
            {profile ? (
              <>
                <h2 className="font-headline-sm text-headline-sm text-primary truncate mt-space-3xs">{profile.name}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-3xs mt-space-3xs">
                  <span className="material-symbols-outlined text-[15px] text-outline">schedule</span>
                  {formatDate(profile.dateOfBirth, language)} • {profile.timeOfBirth} • {profile.placeName}
                </p>
              </>
            ) : (
              <h2 className="font-headline-sm text-headline-sm text-primary truncate mt-space-3xs">{t.resultsTitle}</h2>
            )}
          </div>
          <PdfDownloadButton jathakamId={jathakam.id} language={language} variant="icon" />
        </div>

        {showAccuracyWarning && (
          <p className="mt-space-sm px-space-sm py-space-xs rounded-lg bg-secondary-fixed/40 text-on-secondary-fixed-variant font-body-sm text-body-sm">
            {t.missingBirthTimeWarning}
          </p>
        )}

        <div className="grid grid-cols-3 gap-space-xs mt-space-sm">
          <QuickBadge label={t.lagnaLabel} value={language === 'ta' ? jathakam.lagna.signName.ta : jathakam.lagna.signName.en} />
          <QuickBadge label={t.rasiLabel} value={language === 'ta' ? jathakam.rasi.signName.ta : jathakam.rasi.signName.en} />
          <QuickBadge
            label={t.nakshatraLabel}
            value={`${language === 'ta' ? jathakam.rasi.nakshatraName.ta : jathakam.rasi.nakshatraName.en} • ${t.padaLabel} ${jathakam.rasi.pada}`}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-16 z-40 w-full bg-surface/95 backdrop-blur-md px-margin-mobile py-space-xs overflow-x-auto no-scrollbar shadow-sm">
        <nav className="flex items-center gap-space-xs whitespace-nowrap" role="tablist">
          {tabs.map((tabDef) => (
            <button
              key={tabDef.key}
              aria-selected={tab === tabDef.key}
              className={`px-space-md py-space-2xs rounded-full font-label-md text-label-md transition-colors ${
                tab === tabDef.key ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'
              }`}
              role="tab"
              type="button"
              onClick={() => setTab(tabDef.key)}
            >
              {tabDef.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="px-margin-mobile py-space-md flex flex-col gap-space-md">
        {tab === 'overview' && (
          <>
            <Card icon="explore" title={t.rasiChartTitle}>
              <SouthIndianChart
                centerLabel={language === 'ta' ? 'ராசி' : 'Rasi'}
                houses={jathakam.houses}
                lagnaSignIndex={jathakam.lagna.signIndex}
                language={language}
                planetFlags={planetFlags}
              />
            </Card>
            {dashaError && (
              <p className="text-error font-body-sm text-body-sm">
                {t.error}: {dashaError}
              </p>
            )}
            {dasha && (
              <Card icon="hourglass_top" title={t.currentDashaLabel}>
                <DashaPanel dasha={dasha} language={language} />
              </Card>
            )}
          </>
        )}

        {tab === 'navamsa' &&
          (jathakam.navamsa ? (
            <Card icon="explore" title={t.navamsaChartTitle}>
              <SouthIndianChart
                centerLabel={language === 'ta' ? 'நவாம்சம்' : 'Navamsa'}
                houses={jathakam.navamsa.houses}
                lagnaSignIndex={jathakam.navamsa.lagnaSignIndex}
                language={language}
                planetFlags={planetFlags}
              />
            </Card>
          ) : (
            <p className="text-on-surface-variant font-body-sm text-body-sm">{t.none}</p>
          ))}

        {tab === 'houses' && (
          <Card icon="account_balance" title={t.houseAnalysisTitle}>
            <HouseAnalysisTable houseAnalysis={jathakam.houseAnalysis} language={language} />
          </Card>
        )}

        {tab === 'dasha' && (
          <Card icon="hourglass_top" title={t.dashaTitle}>
            {dashaError && (
              <p className="text-error font-body-sm text-body-sm">
                {t.error}: {dashaError}
              </p>
            )}
            {dasha && <DashaPanel dasha={dasha} language={language} />}
          </Card>
        )}

        {tab === 'transit' && (
          <Card icon="public" title={t.transitTitle}>
            {transitsError && (
              <p className="text-error font-body-sm text-body-sm">
                {t.error}: {transitsError}
              </p>
            )}
            {transits && <TransitPanel language={language} transits={transits} />}
          </Card>
        )}

        {tab === 'yogas' && (
          <>
            <Card icon="stars" title={t.yogaTitle}>
              <YogaPanel language={language} yogas={jathakam.yogas} />
            </Card>
            <Card icon="shield" title={t.doshaTitle}>
              <DoshaPanel doshas={jathakam.doshas} language={language} />
            </Card>
          </>
        )}

        {tab === 'ai' && (
          <>
            <Card icon="chat" title={t.askAiTitle}>
              <AskAiPanel jathakamId={jathakam.id} language={language} />
            </Card>
            <Card icon="psychology" title={t.predictionTitle}>
              <PredictionPanel
                initialPredictions={[]}
                jathakamId={jathakam.id}
                language={language}
                mahadashaList={dasha?.mahadashaList ?? []}
              />
            </Card>
          </>
        )}

        <Card icon="description" title={t.reportStructureTitle}>
          <ReportStructurePanel jathakamId={jathakam.id} language={language} />
        </Card>

        <p className="font-body-sm text-body-sm text-on-surface-variant">{t.fullChartNote}</p>
      </div>
    </div>
  );
}

function QuickBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col p-space-xs rounded-lg bg-surface-container-lowest shadow-sm min-w-0">
      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{label}</span>
      <span className="font-title-md text-title-md text-primary mt-space-3xs truncate">{value}</span>
    </div>
  );
}
