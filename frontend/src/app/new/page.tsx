'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import {
  BirthTimeAccuracy,
  createBirthProfile,
  createJathakam,
  DashaSummary,
  Gender,
  getDasha,
  getTransits,
  JathakamSummary,
  TransitSummary,
} from '@/lib/api';
import { labels, WizardLanguage } from './labels';
import { emptyLocation, LocationState, PlaceSearch } from './PlaceSearch';
import { SouthIndianChart } from '@/components/chart/SouthIndianChart';
import { HouseAnalysisTable } from './HouseAnalysisTable';
import { DashaPanel } from './DashaPanel';
import { TransitPanel } from './TransitPanel';
import { YogaPanel } from './YogaPanel';
import { DoshaPanel } from './DoshaPanel';
import { PredictionPanel } from './PredictionPanel';
import { ReportStructurePanel } from './ReportStructurePanel';
import { PdfDownloadButton } from './PdfDownloadButton';

interface FormState {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  timeOfBirth: string;
  timeAccuracy: BirthTimeAccuracy;
  location: LocationState;
}

const initialForm: FormState = {
  name: '',
  gender: 'MALE',
  dateOfBirth: '',
  timeOfBirth: '',
  timeAccuracy: 'EXACT',
  location: emptyLocation,
};

export default function NewJathakamPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState<WizardLanguage>('ta');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [jathakam, setJathakam] = useState<JathakamSummary | null>(null);
  const [computingChart, setComputingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [dasha, setDasha] = useState<DashaSummary | null>(null);
  const [dashaError, setDashaError] = useState<string | null>(null);
  const [transits, setTransits] = useState<TransitSummary | null>(null);
  const [transitsError, setTransitsError] = useState<string | null>(null);

  const t = labels[language];

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  const localDateTime = useMemo(() => {
    if (!form.dateOfBirth || !form.timeOfBirth) return '';
    const time = form.timeOfBirth.length === 5 ? `${form.timeOfBirth}:00` : form.timeOfBirth;
    return `${form.dateOfBirth}T${time}`;
  }, [form.dateOfBirth, form.timeOfBirth]);

  const step1Valid = form.name.trim().length > 0 && form.dateOfBirth !== '' && form.timeOfBirth !== '';
  const step2Valid =
    form.location.placeName !== '' &&
    form.location.latitude !== null &&
    form.location.longitude !== null &&
    form.location.timezone !== '' &&
    form.location.utcOffsetMinutes !== null;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const profile = await createBirthProfile({
        name: form.name.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        timeOfBirth: form.timeOfBirth,
        timeAccuracy: form.timeAccuracy,
        location: {
          placeName: form.location.placeName,
          country: form.location.country,
          latitude: form.location.latitude as number,
          longitude: form.location.longitude as number,
          timezone: form.location.timezone,
          utcOffsetMinutes: form.location.utcOffsetMinutes as number,
          dstApplicable: form.location.dstApplicable,
          manuallyCorrected: form.location.manuallyCorrected,
        },
      });
      setCreatedId(profile.id);
      setSubmitting(false);

      setComputingChart(true);
      try {
        const chart = await createJathakam(profile.id);
        setJathakam(chart);
        try {
          const dashaSummary = await getDasha(chart.id);
          setDasha(dashaSummary);
        } catch (err) {
          setDashaError(err instanceof Error ? err.message : String(err));
        }
        try {
          const transitSummary = await getTransits(chart.id);
          setTransits(transitSummary);
        } catch (err) {
          setTransitsError(err instanceof Error ? err.message : String(err));
        }
      } catch (err) {
        setChartError(err instanceof Error ? err.message : String(err));
      } finally {
        setComputingChart(false);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  if (!authChecked) return null;

  if (createdId) {
    const showAccuracyWarning = form.timeAccuracy === 'UNKNOWN' || form.timeAccuracy === 'WITHIN_30_MIN';

    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h1>{t.successTitle}</h1>

          {computingChart && <p style={{ color: '#666' }}>{t.computingChart}</p>}

          {chartError && (
            <p style={{ color: '#c0392b' }}>
              {t.error}: {chartError}
            </p>
          )}

          {jathakam && jathakam.lagna && jathakam.rasi && (
            <div style={selectedBoxStyle}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t.resultsTitle}</h2>

              {showAccuracyWarning && <p style={warningStyle}>{t.missingBirthTimeWarning}</p>}

              {(() => {
                const planetFlags = Object.fromEntries(
                  jathakam.planets.map((p) => [p.graha, { retrograde: p.retrograde, combust: p.combust }]),
                );
                return (
                  <>
                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.rasiChartTitle}</h3>
                    <SouthIndianChart
                      lagnaSignIndex={jathakam.lagna!.signIndex}
                      houses={jathakam.houses}
                      planetFlags={planetFlags}
                      language={language}
                      centerLabel={language === 'ta' ? 'ராசி' : 'Rasi'}
                    />

                    {jathakam.navamsa && (
                      <>
                        <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>
                          {t.navamsaChartTitle}
                        </h3>
                        <SouthIndianChart
                          lagnaSignIndex={jathakam.navamsa.lagnaSignIndex}
                          houses={jathakam.navamsa.houses}
                          planetFlags={planetFlags}
                          language={language}
                          centerLabel={language === 'ta' ? 'நவாம்சம்' : 'Navamsa'}
                        />
                      </>
                    )}
                  </>
                );
              })()}

              <div>
                <strong>{t.lagnaLabel}:</strong>{' '}
                {language === 'ta' ? jathakam.lagna.signName.ta : jathakam.lagna.signName.en} (
                {jathakam.lagna.degreeInSign.toFixed(2)}° {t.degreeLabel})
              </div>
              <div>
                <strong>{t.rasiLabel}:</strong>{' '}
                {language === 'ta' ? jathakam.rasi.signName.ta : jathakam.rasi.signName.en}
              </div>
              <div>
                <strong>{t.nakshatraLabel}:</strong>{' '}
                {language === 'ta' ? jathakam.rasi.nakshatraName.ta : jathakam.rasi.nakshatraName.en} —{' '}
                {t.padaLabel} {jathakam.rasi.pada}
              </div>

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>
                {t.houseAnalysisTitle}
              </h3>
              <HouseAnalysisTable language={language} houseAnalysis={jathakam.houseAnalysis} />

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.yogaTitle}</h3>
              <YogaPanel language={language} yogas={jathakam.yogas} />

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.doshaTitle}</h3>
              <DoshaPanel language={language} doshas={jathakam.doshas} />

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.dashaTitle}</h3>
              {dashaError && (
                <p style={{ color: '#c0392b' }}>
                  {t.error}: {dashaError}
                </p>
              )}
              {dasha && <DashaPanel language={language} dasha={dasha} />}

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.transitTitle}</h3>
              {transitsError && (
                <p style={{ color: '#c0392b' }}>
                  {t.error}: {transitsError}
                </p>
              )}
              {transits && <TransitPanel language={language} transits={transits} />}

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.predictionTitle}</h3>
              <PredictionPanel
                language={language}
                jathakamId={jathakam.id}
                initialPredictions={[]}
                mahadashaList={dasha?.mahadashaList ?? []}
              />

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.reportStructureTitle}</h3>
              <ReportStructurePanel language={language} jathakamId={jathakam.id} />

              <h3 style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', color: '#555' }}>{t.pdfTitle}</h3>
              <PdfDownloadButton language={language} jathakamId={jathakam.id} />

              <p style={{ ...warningStyle, color: '#666' }}>{t.fullChartNote}</p>
            </div>
          )}

          <p style={{ fontSize: '0.85rem', color: '#999' }}>ID: {createdId}</p>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => {
              setForm(initialForm);
              setCreatedId(null);
              setJathakam(null);
              setChartError(null);
              setDasha(null);
              setDashaError(null);
              setTransits(null);
              setTransitsError(null);
              setStep(1);
            }}
          >
            {t.createAnother}
          </button>
          <p>
            <Link href="/">← {language === 'ta' ? 'முகப்புக்குத் திரும்பு' : 'Back to home'}</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={languageBarStyle}>
          <span>{t.languagePrompt}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              style={language === 'ta' ? langButtonActive : langButton}
            >
              {t.tamil}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={language === 'en' ? langButtonActive : langButton}
            >
              {t.english}
            </button>
          </div>
        </div>

        <StepIndicator step={step} labels={[t.step1Title, t.step2Title, t.step3Title]} />

        {step === 1 && (
          <section style={sectionStyle}>
            <h2>{t.step1Title}</h2>
            <label>
              {t.name}
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label>
              {t.gender}
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                style={inputStyle}
              >
                <option value="MALE">{t.male}</option>
                <option value="FEMALE">{t.female}</option>
                <option value="OTHER">{t.other}</option>
              </select>
            </label>
            <label>
              {t.dateOfBirth}
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label>
              {t.timeOfBirth}
              <input
                type="time"
                step={1}
                value={form.timeOfBirth}
                onChange={(e) => setForm({ ...form, timeOfBirth: e.target.value })}
                style={inputStyle}
              />
            </label>
            <label>
              {t.timeAccuracyQuestion}
              <select
                value={form.timeAccuracy}
                onChange={(e) => setForm({ ...form, timeAccuracy: e.target.value as BirthTimeAccuracy })}
                style={inputStyle}
              >
                {Object.entries(t.timeAccuracy).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {form.timeAccuracy === 'UNKNOWN' && (
              <p style={warningStyle}>{t.missingBirthTimeWarning}</p>
            )}

            <div style={navRowStyle}>
              <span />
              <button type="button" disabled={!step1Valid} style={primaryButtonStyle} onClick={() => setStep(2)}>
                {t.next}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section style={sectionStyle}>
            <h2>{t.step2Title}</h2>
            <PlaceSearch
              language={language}
              localDateTime={localDateTime}
              value={form.location}
              onChange={(location) => setForm({ ...form, location })}
            />
            <div style={navRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => setStep(1)}>
                {t.back}
              </button>
              <button type="button" disabled={!step2Valid} style={primaryButtonStyle} onClick={() => setStep(3)}>
                {t.next}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section style={sectionStyle}>
            <h2>{t.step3Title}</h2>
            <div style={selectedBoxStyle}>
              <strong>{t.ayanamsaLabel}:</strong> {t.ayanamsaValue}
              <p style={{ ...warningStyle, color: '#666' }}>{t.ayanamsaNote}</p>
            </div>

            {submitError && (
              <p style={{ color: '#c0392b' }}>
                {t.error}: {submitError}
              </p>
            )}

            <div style={navRowStyle}>
              <button type="button" style={secondaryButtonStyle} onClick={() => setStep(2)}>
                {t.back}
              </button>
              <button type="button" style={primaryButtonStyle} disabled={submitting} onClick={handleSubmit}>
                {submitting ? t.submitting : t.submit}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step, labels: stepLabels }: { step: number; labels: string[] }) {
  return (
    <ol style={{ display: 'flex', gap: '1rem', padding: 0, listStyle: 'none', fontSize: '0.85rem' }}>
      {stepLabels.map((label, i) => (
        <li key={label} style={{ color: step === i + 1 ? '#111' : '#aaa', fontWeight: step === i + 1 ? 600 : 400 }}>
          {label}
        </li>
      ))}
    </ol>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  padding: '2rem 1rem',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '520px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const languageBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.85rem',
  color: '#555',
};

const langButton: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
};

const langButtonActive: React.CSSProperties = {
  ...langButton,
  background: '#111',
  color: 'white',
  border: '1px solid #111',
};

const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem' };

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  marginTop: '0.25rem',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '1rem',
};

const navRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between' };

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.4rem',
  borderRadius: '6px',
  border: 'none',
  background: '#111',
  color: 'white',
  cursor: 'pointer',
  fontSize: '1rem',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.4rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  background: 'white',
  cursor: 'pointer',
  fontSize: '1rem',
};

const warningStyle: React.CSSProperties = {
  color: '#a15c00',
  background: '#fff7e6',
  padding: '0.5rem 0.75rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  margin: 0,
};

const selectedBoxStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};
