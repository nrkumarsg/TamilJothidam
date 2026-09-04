import { Gender, BirthTimeAccuracy } from '@prisma/client';
import { JathakamSummary } from '../../jathakam/jathakam.service';
import { DashaSummary } from '../../dasha/dasha.service';
import { TransitSummary } from '../../transits/transits.service';
import { FullReport } from '../report.types';
import { REPORT_SECTIONS } from '../../i18n/glossary';
import { buildReportHtml, ReportTemplateInput } from './report-template';

const jathakam: JathakamSummary = {
  id: 'jathakam-1',
  profileId: 'profile-1',
  julianDay: 2447906.5,
  ayanamsa: 'LAHIRI',
  engineVersion: '1.0',
  createdAt: new Date('2026-01-01'),
  lagna: {
    id: 'p-lagna', jathakamId: 'jathakam-1', graha: 'LAGNA', longitude: 310, signIndex: 10,
    degreeInSign: 10, nakshatra: 24, pada: 2, house: 1, retrograde: false, combust: false,
    dignity: null, strengthScore: null,
    signName: { ta: 'கும்பம்', en: 'Aquarius' }, nakshatraName: { ta: 'சதயம்', en: 'Shatabhisha' }, aspectsHouses: [7],
  },
  rasi: {
    id: 'p-moon', jathakamId: 'jathakam-1', graha: 'MOON', longitude: 45, signIndex: 1,
    degreeInSign: 15, nakshatra: 4, pada: 1, house: 4, retrograde: false, combust: false,
    dignity: null, strengthScore: 5,
    signName: { ta: 'ரிஷபம்', en: 'Taurus' }, nakshatraName: { ta: 'ரோகிணி', en: 'Rohini' }, aspectsHouses: [10],
  },
  planets: [
    {
      id: 'p-sun', jathakamId: 'jathakam-1', graha: 'SUN', longitude: 300, signIndex: 10,
      degreeInSign: 0, nakshatra: 23, pada: 1, house: 1, retrograde: false, combust: false,
      dignity: 'NEUTRAL', strengthScore: 4,
      signName: { ta: 'கும்பம்', en: 'Aquarius' }, nakshatraName: { ta: 'தனிஷ்டா', en: 'Dhanishta' }, aspectsHouses: [7],
    },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    id: `h-${i + 1}`, jathakamId: 'jathakam-1', houseNo: i + 1, signIndex: (10 + i) % 12,
    lord: 'SATURN', lordHouse: 1, occupants: i === 0 ? ['SUN'] : [],
    signName: { ta: `ராசி${i}`, en: `Sign${i}` },
  })),
  navamsa: {
    lagnaSignIndex: 4,
    lagnaSignName: { ta: 'சிம்மம்', en: 'Leo' },
    houses: Array.from({ length: 12 }, (_, i) => ({
      houseNo: i + 1, signIndex: (4 + i) % 12, occupants: [], signName: { ta: `நவ${i}`, en: `Nav${i}` },
    })),
  },
  houseAnalysis: Array.from({ length: 12 }, (_, i) => ({
    houseNo: i + 1, signIndex: (10 + i) % 12, signName: { ta: `ராசி${i}`, en: `Sign${i}` },
    signification: { ta: 'குறிப்பு', en: 'Signification' }, lord: 'SATURN', lordHouse: 1,
    occupants: i === 0 ? ['SUN'] : [], conjunction: false, aspectingGrahas: [],
    beneficInfluences: [], maleficInfluences: [], strengthScore: 4.2,
  })),
  yogas: [
    { id: 'y1', jathakamId: 'jathakam-1', name: 'Raja Yoga', strength: 'STRONG', participatingPlanets: ['SUN', 'MOON'], participatingHouses: [1, 4], interpretationKey: 'raja_yoga', description: { ta: 'அரச யோகம்', en: 'A royal combination' } },
  ],
  doshas: [
    { id: 'd1', jathakamId: 'jathakam-1', name: 'Kala Sarpa Dosha', severity: 'MODERATE', ruleTriggered: 'All grahas hemmed', description: { ta: 'கால சர்ப்ப தோஷம்', en: 'Kala Sarpa affliction' } },
  ],
};

const dasha: DashaSummary = {
  asOfDate: '2026-09-04T00:00:00.000Z',
  mahadasha: { previous: null, current: { graha: 'SATURN', startDate: '2020-01-01T00:00:00.000Z', endDate: '2039-01-01T00:00:00.000Z' }, next: null },
  antardasha: { previous: null, current: { graha: 'MERCURY', startDate: '2025-01-01T00:00:00.000Z', endDate: '2027-01-01T00:00:00.000Z' }, next: null },
  pratyantardasha: { previous: null, current: { graha: 'VENUS', startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-11-01T00:00:00.000Z' }, next: null },
  mahadashaList: [
    { graha: 'SATURN', startDate: '2020-01-01T00:00:00.000Z', endDate: '2039-01-01T00:00:00.000Z', antardashas: [] },
  ],
};

const transits: TransitSummary = {
  asOfDate: '2026-09-04T00:00:00.000Z',
  natalMoonSignIndex: 1,
  natalLagnaSignIndex: 10,
  transits: [
    { graha: 'SATURN', signIndex: 11, signName: { ta: 'மீனம்', en: 'Pisces' }, retrograde: false, houseFromMoon: 11, houseFromLagna: 2 },
  ],
  sadeSati: { active: false, phase: null },
  ashtamaShani: true,
  janmaShani: false,
};

function fullReport(overrides: Partial<FullReport['sections'][number]>[] = []): FullReport {
  const sections = REPORT_SECTIONS.map((s) => {
    const base = { id: s.id, slug: s.slug, title: { ta: s.ta, en: s.en }, status: 'unavailable' as const };
    const override = overrides.find((o) => o.id === s.id);
    return { ...base, ...override };
  });
  return { jathakamId: 'jathakam-1', language: 'TA', generatedAt: '2026-09-04T00:00:00.000Z', sections };
}

const profile: ReportTemplateInput['profile'] = {
  id: 'profile-1', userId: 'user-1', name: 'சோதனை பெயர்', gender: Gender.MALE,
  dateOfBirth: new Date('1990-01-15'), timeOfBirth: '08:30:00', timeAccuracy: BirthTimeAccuracy.EXACT,
  createdAt: new Date(), updatedAt: new Date(),
  birthLocation: { placeName: 'Chennai, Tamil Nadu, India' },
};

describe('buildReportHtml', () => {
  it('produces a well-formed HTML document', () => {
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: fullReport() });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('renders the cover page with profile details', () => {
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: fullReport() });
    expect(html).toContain('சோதனை பெயர்');
    expect(html).toContain('1990-01-15');
    expect(html).toContain('Chennai, Tamil Nadu, India');
  });

  it('renders all 34 section headings, numbered, in order', () => {
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: fullReport() });
    for (const section of REPORT_SECTIONS) {
      expect(html).toContain(`${section.id}. ${section.ta}`);
    }
  });

  it('renders real chart_data content for a chart-backed section (planetary_positions)', () => {
    const report = fullReport([{ id: 4, status: 'chart_data' }]);
    const html = buildReportHtml({ language: 'ta' === 'ta' ? 'TA' : 'EN', profile, jathakam, dasha, transits, fullReport: report });
    expect(html).toContain('சூரியன்'); // Sun's full name from the glossary
  });

  it('renders the rasi_chart section as an embedded SVG', () => {
    const report = fullReport([{ id: 5, status: 'chart_data' }]);
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: report });
    expect(html).toContain('<svg');
  });

  it('renders cached AI prediction text for an ai_generated section', () => {
    const report = fullReport([
      {
        id: 1, status: 'ai_generated', predictionSection: 'basic_reading',
        prediction: {
          id: 'pred-1', jathakamId: 'jathakam-1', section: 'basic_reading', language: 'TA',
          text: 'இது ஒரு சோதனை AI உரை.', confidence: 'HIGH', aiProvider: 'ANTHROPIC', aiModel: 'fake',
          promptVersion: '1.0', createdAt: new Date(),
        } as never,
      },
    ]);
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: report });
    expect(html).toContain('இது ஒரு சோதனை AI உரை.');
  });

  it('renders a pending placeholder (not fabricated text) for an ai_pending section', () => {
    const report = fullReport([{ id: 17, status: 'ai_pending', predictionSection: 'health', prediction: null }]);
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: report });
    expect(html).toContain('இன்னும் உருவாக்கப்படவில்லை');
  });

  it('renders an "unavailable" note for sections with no engine yet', () => {
    const report = fullReport([{ id: 32, status: 'unavailable' }]); // remedies
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: report });
    expect(html).toContain('இன்னும் கிடைக்கவில்லை');
  });

  it('renders the mandatory spec §44 disclaimer sentence', () => {
    const html = buildReportHtml({ language: 'TA', profile, jathakam, dasha, transits, fullReport: fullReport() });
    expect(html).toContain('இது அறிவியல் உறுதி செய்யப்பட்ட எதிர்கால கணிப்பு அல்ல');
  });

  it('renders English content when language is EN', () => {
    const report = fullReport([{ id: 1, status: 'unavailable' }]);
    const html = buildReportHtml({ language: 'EN', profile, jathakam, dasha, transits, fullReport: { ...report, language: 'EN', sections: report.sections.map((s) => ({ ...s })) } });
    expect(html).toContain('Jathakam Report');
    expect(html).toContain('This report is an interpretation based on traditional astrological principles');
  });

  it('escapes user-controlled text (profile name) to avoid breaking the HTML', () => {
    const maliciousProfile = { ...profile, name: '<script>alert(1)</script>' };
    const html = buildReportHtml({ language: 'TA', profile: maliciousProfile, jathakam, dasha, transits, fullReport: fullReport() });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
