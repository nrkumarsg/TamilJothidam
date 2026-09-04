import * as fs from 'fs';
import * as path from 'path';
import { BirthProfile, Language, Prediction } from '@prisma/client';
import { JathakamSummary } from '../../jathakam/jathakam.service';
import { DashaSummary } from '../../dasha/dasha.service';
import { TransitSummary } from '../../transits/transits.service';
import { FullReport } from '../report.types';
import { grahaName } from '../../i18n/glossary';
import { buildSouthIndianChartSvg, ChartPlanetFlags } from './rasi-chart-svg';

// assets/ is a sibling of src/ at the backend root (same reasoning as
// prompt-loader.service.ts's PROMPTS_DIR — this resolves correctly from
// both src/ under ts-node-dev and dist/ once compiled, since backend/src/
// and backend/dist/ sit at the same depth).
const FONT_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'NotoSansTamil-Regular.ttf');
let cachedFontDataUri: string | null | undefined;

function fontDataUri(): string | null {
  if (cachedFontDataUri !== undefined) return cachedFontDataUri;
  try {
    cachedFontDataUri = `data:font/ttf;base64,${fs.readFileSync(FONT_PATH).toString('base64')}`;
  } catch {
    // Falls back to a system Tamil-capable font (e.g. Windows' Nirmala UI)
    // via the font-family stack below — the PDF still renders correct
    // Tamil Unicode, just without the specific embedded typeface.
    cachedFontDataUri = null;
  }
  return cachedFontDataUri;
}

function esc(text: string): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface ReportTemplateInput {
  language: Language;
  profile: BirthProfile & { birthLocation: { placeName: string } | null };
  jathakam: JathakamSummary;
  dasha: DashaSummary;
  transits: TransitSummary;
  fullReport: FullReport;
}

const T = (ta: string, en: string, lang: Language) => (lang === 'TA' ? ta : en);

export function buildReportHtml(input: ReportTemplateInput): string {
  const { language: lang } = input;
  const font = fontDataUri();

  const fontFace = font
    ? `@font-face { font-family: 'Noto Sans Tamil'; src: url('${font}') format('truetype'); font-weight: 100 900; }`
    : '';

  const body = input.fullReport.sections
    .map((section) => renderSection(section, input))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${lang === 'TA' ? 'ta' : 'en'}">
<head>
<meta charset="utf-8" />
<style>
  ${fontFace}
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Tamil', 'Nirmala UI', 'Noto Sans', sans-serif;
    color: #1a1a1a;
    font-size: 12px;
    line-height: 1.6;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #333; }
  h3 { font-size: 12px; margin: 10px 0 4px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  th { background: #f2f2f2; }
  .cover { text-align: center; padding-top: 60px; page-break-after: always; }
  .cover-field { font-size: 13px; margin: 4px 0; }
  .section { page-break-inside: avoid; }
  .charts { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .unavailable { color: #999; font-style: italic; }
  .ai-text { white-space: pre-wrap; }
  .disclaimer { margin-top: 30px; padding: 10px; background: #fafafa; border: 1px solid #ddd; font-size: 10px; color: #555; }
  .muted { color: #777; font-size: 10.5px; }
</style>
</head>
<body>
${renderCover(input)}
${body}
${renderDisclaimer(lang)}
</body>
</html>`;
}

function renderCover(input: ReportTemplateInput): string {
  const { profile, language: lang } = input;
  const dob = profile.dateOfBirth.toISOString().slice(0, 10);
  return `<div class="cover">
    <h1>${T('ஜாதக அறிக்கை', 'Jathakam Report', lang)}</h1>
    <p class="cover-field"><strong>${T('பெயர்', 'Name', lang)}:</strong> ${esc(profile.name)}</p>
    <p class="cover-field"><strong>${T('பிறந்த தேதி', 'Date of Birth', lang)}:</strong> ${dob}</p>
    <p class="cover-field"><strong>${T('பிறந்த நேரம்', 'Time of Birth', lang)}:</strong> ${esc(profile.timeOfBirth)}</p>
    <p class="cover-field"><strong>${T('பிறந்த இடம்', 'Place of Birth', lang)}:</strong> ${esc(
      profile.birthLocation?.placeName ?? '—',
    )}</p>
  </div>`;
}

function renderSection(section: FullReport['sections'][number], input: ReportTemplateInput): string {
  const title = input.language === 'TA' ? section.title.ta : section.title.en;
  const heading = `<h2>${section.id}. ${esc(title)}</h2>`;

  let content: string;
  if (section.status === 'unavailable') {
    content = `<p class="unavailable">${T('இந்தப் பிரிவு இன்னும் கிடைக்கவில்லை.', 'This section is not yet available.', input.language)}</p>`;
  } else if (section.status === 'ai_pending') {
    content = `<p class="unavailable">${T(
      'இந்தப் பிரிவுக்கான AI விளக்கம் இன்னும் உருவாக்கப்படவில்லை.',
      'The AI interpretation for this section has not been generated yet.',
      input.language,
    )}</p>`;
  } else if (section.status === 'ai_generated') {
    content = renderPrediction(section.prediction ?? null, input.language);
  } else {
    content = renderChartData(section.slug, input);
  }

  return `<div class="section">${heading}${content}</div>`;
}

function renderPrediction(prediction: Prediction | null, lang: Language): string {
  if (!prediction) {
    return `<p class="unavailable">${T('கிடைக்கவில்லை', 'Not available', lang)}</p>`;
  }
  return `<p class="ai-text">${esc(prediction.text)}</p>
    <p class="muted">${T('நம்பகத்தன்மை', 'Confidence', lang)}: ${esc(prediction.confidence ?? '—')}</p>`;
}

function planetFlagsMap(jathakam: JathakamSummary): Record<string, ChartPlanetFlags> {
  return Object.fromEntries(
    jathakam.planets.map((p) => [p.graha, { retrograde: p.retrograde, combust: p.combust }]),
  );
}

function renderChartData(slug: string, input: ReportTemplateInput): string {
  const { jathakam, dasha, transits, language: lang } = input;

  switch (slug) {
    case 'lagna_rasi': {
      if (!jathakam.lagna || !jathakam.rasi) return '';
      const lagnaSign = lang === 'TA' ? jathakam.lagna.signName.ta : jathakam.lagna.signName.en;
      const rasiSign = lang === 'TA' ? jathakam.rasi.signName.ta : jathakam.rasi.signName.en;
      return `<table>
        <tr><th>${T('லக்னம்', 'Lagna', lang)}</th><td>${esc(lagnaSign)} (${jathakam.lagna.degreeInSign.toFixed(2)}°)</td></tr>
        <tr><th>${T('ராசி', 'Rasi', lang)}</th><td>${esc(rasiSign)}</td></tr>
      </table>`;
    }

    case 'nakshatra_pada': {
      if (!jathakam.rasi) return '';
      const nakshatra = lang === 'TA' ? jathakam.rasi.nakshatraName.ta : jathakam.rasi.nakshatraName.en;
      return `<table><tr><th>${T('நட்சத்திரம்', 'Nakshatra', lang)}</th><td>${esc(nakshatra)}</td></tr>
        <tr><th>${T('பாதம்', 'Pada', lang)}</th><td>${jathakam.rasi.pada}</td></tr></table>`;
    }

    case 'planetary_positions': {
      const rows = jathakam.planets
        .filter((p) => p.graha !== 'LAGNA')
        .map((p) => {
          const name = lang === 'TA' ? grahaName(p.graha).ta : grahaName(p.graha).en;
          const sign = lang === 'TA' ? p.signName.ta : p.signName.en;
          return `<tr><td>${esc(name)}</td><td>${esc(sign)}</td><td>${p.degreeInSign.toFixed(2)}°</td><td>${p.house}</td><td>${p.retrograde ? T('வக்ரம்', 'R', lang) : '—'}</td><td>${esc(p.dignity ?? '—')}</td></tr>`;
        })
        .join('');
      return `<table><tr><th>${T('கிரகம்', 'Graha', lang)}</th><th>${T('ராசி', 'Sign', lang)}</th><th>${T('பாகை', 'Degree', lang)}</th><th>${T('பாவம்', 'House', lang)}</th><th>${T('வக்ரம்', 'Retro', lang)}</th><th>${T('கண்ணியம்', 'Dignity', lang)}</th></tr>${rows}</table>`;
    }

    case 'rasi_chart': {
      if (!jathakam.lagna) return '';
      const houses = jathakam.houses.map((h) => ({ ...h, signName: h.signName }));
      return `<div class="charts">${buildSouthIndianChartSvg(
        jathakam.lagna.signIndex,
        houses,
        planetFlagsMap(jathakam),
        lang === 'TA' ? 'ta' : 'en',
        T('ராசி', 'Rasi', lang),
      )}</div>`;
    }

    case 'navamsa_chart': {
      if (!jathakam.navamsa) {
        return `<p class="unavailable">${T('நவாம்ச தரவு இல்லை', 'Navamsa data unavailable', lang)}</p>`;
      }
      return `<div class="charts">${buildSouthIndianChartSvg(
        jathakam.navamsa.lagnaSignIndex,
        jathakam.navamsa.houses,
        planetFlagsMap(jathakam),
        lang === 'TA' ? 'ta' : 'en',
        T('நவாம்சம்', 'Navamsa', lang),
      )}</div>`;
    }

    case 'house_analysis': {
      const rows = jathakam.houseAnalysis
        .map((h) => {
          const sign = lang === 'TA' ? h.signName.ta : h.signName.en;
          const lord = lang === 'TA' ? grahaName(h.lord).ta : grahaName(h.lord).en;
          const occupants = h.occupants.map((g) => (lang === 'TA' ? grahaName(g).ta : grahaName(g).en)).join(', ') || '—';
          return `<tr><td>${h.houseNo}</td><td>${esc(sign)}</td><td>${esc(lord)}</td><td>${esc(occupants)}</td><td>${h.strengthScore?.toFixed(1) ?? '—'}</td></tr>`;
        })
        .join('');
      return `<table><tr><th>${T('பாவம்', 'House', lang)}</th><th>${T('ராசி', 'Sign', lang)}</th><th>${T('அதிபதி', 'Lord', lang)}</th><th>${T('கிரகங்கள்', 'Occupants', lang)}</th><th>${T('பலம்', 'Strength', lang)}</th></tr>${rows}</table>`;
    }

    case 'yogas': {
      if (jathakam.yogas.length === 0) {
        return `<p class="unavailable">${T('யோகங்கள் எதுவும் கண்டறியப்படவில்லை', 'No yogas detected', lang)}</p>`;
      }
      const items = jathakam.yogas
        .map((y) => `<li><strong>${esc(y.name)}</strong> (${esc(y.strength)}) — ${esc((lang === 'TA' ? y.description?.ta : y.description?.en) ?? '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    case 'doshas': {
      if (jathakam.doshas.length === 0) {
        return `<p class="unavailable">${T('தோஷங்கள் எதுவும் கண்டறியப்படவில்லை', 'No doshas detected', lang)}</p>`;
      }
      const items = jathakam.doshas
        .map((d) => `<li><strong>${esc(d.name)}</strong> (${esc(d.severity)}) — ${esc((lang === 'TA' ? d.description?.ta : d.description?.en) ?? '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    case 'vimshottari_dasha': {
      const rows = dasha.mahadashaList
        .map((m) => {
          const name = lang === 'TA' ? grahaName(m.graha).ta : grahaName(m.graha).en;
          return `<tr><td>${esc(name)}</td><td>${m.startDate.slice(0, 10)}</td><td>${m.endDate.slice(0, 10)}</td></tr>`;
        })
        .join('');
      return `<table><tr><th>${T('மகாதசை', 'Mahadasha', lang)}</th><th>${T('தொடக்கம்', 'Start', lang)}</th><th>${T('முடிவு', 'End', lang)}</th></tr>${rows}</table>`;
    }

    case 'current_dasha': {
      const row = (label: string, p: typeof dasha.mahadasha.current) =>
        p ? `<tr><th>${label}</th><td>${esc(lang === 'TA' ? grahaName(p.graha).ta : grahaName(p.graha).en)} (${p.startDate.slice(0, 10)} – ${p.endDate.slice(0, 10)})</td></tr>` : '';
      return `<table>
        ${row(T('மகாதசை', 'Mahadasha', lang), dasha.mahadasha.current)}
        ${row(T('அந்தரம்', 'Antardasha', lang), dasha.antardasha.current)}
        ${row(T('பிரத்யந்தரம்', 'Pratyantardasha', lang), dasha.pratyantardasha.current)}
      </table>`;
    }

    case 'transit_results': {
      const rows = transits.transits
        .map((t) => {
          const name = lang === 'TA' ? grahaName(t.graha).ta : grahaName(t.graha).en;
          const sign = lang === 'TA' ? t.signName.ta : t.signName.en;
          return `<tr><td>${esc(name)}</td><td>${esc(sign)}</td><td>${t.houseFromMoon}</td><td>${t.houseFromLagna}</td></tr>`;
        })
        .join('');
      const flags = `<p class="muted">${T('சாடே சாத்தி', 'Sade Sati', lang)}: ${transits.sadeSati.active ? esc(transits.sadeSati.phase ?? '') : T('இல்லை', 'No', lang)} · ${T('அஷ்டம சனி', 'Ashtama Shani', lang)}: ${transits.ashtamaShani ? T('ஆம்', 'Yes', lang) : T('இல்லை', 'No', lang)} · ${T('ஜென்ம சனி', 'Janma Shani', lang)}: ${transits.janmaShani ? T('ஆம்', 'Yes', lang) : T('இல்லை', 'No', lang)}</p>`;
      return `<table><tr><th>${T('கிரகம்', 'Graha', lang)}</th><th>${T('ராசி', 'Sign', lang)}</th><th>${T('ராசியிலிருந்து பாவம்', 'House from Moon', lang)}</th><th>${T('லக்னத்திலிருந்து பாவம்', 'House from Lagna', lang)}</th></tr>${rows}</table>${flags}`;
    }

    default:
      return '';
  }
}

function renderDisclaimer(lang: Language): string {
  return `<div class="disclaimer">${T(
    'இந்த அறிக்கை பாரம்பரிய ஜோதிடக் கொள்கைகளின் அடிப்படையில் உருவாக்கப்பட்ட ஒரு விளக்கமாகும். இது அறிவியல் உறுதி செய்யப்பட்ட எதிர்கால கணிப்பு அல்ல. உடல்நலம், நிதி, சட்டம் அல்லது வாழ்க்கையின் முக்கிய முடிவுகளுக்கு தகுதியான நிபுணர்களின் ஆலோசனையைப் பெறவும்.',
    'This report is an interpretation based on traditional astrological principles. It is not a scientifically verified prediction of the future. Please seek qualified professional advice for health, financial, legal, or major life decisions.',
    lang,
  )}</div>`;
}
