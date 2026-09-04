import { Graha } from '@prisma/client';
import { BilingualLabel } from '../../jathakam/names';

// Ported from frontend/src/components/chart/SouthIndianChart.tsx so the
// PDF's chart looks identical to the web chart, without needing a browser
// to run React — this is a static SVG string builder. Keep the two in sync
// by hand if the layout ever changes; there's no shared package between
// frontend and backend to import from directly.
const SIGN_GRID_POSITION: [row: number, col: number][] = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];

const CELL = 110;
const SIZE = CELL * 4;

// Short display abbreviations for grahas inside chart cells — same role as
// frontend/src/components/chart/graha-labels.ts's GRAHA_ABBREV, duplicated
// here rather than shared (no cross-package import path between frontend
// and backend in this monorepo).
const GRAHA_ABBREV: Record<Graha, BilingualLabel> = {
  SUN: { ta: 'சூரி', en: 'Su' },
  MOON: { ta: 'சந்', en: 'Mo' },
  MARS: { ta: 'செவ்', en: 'Ma' },
  MERCURY: { ta: 'புத', en: 'Me' },
  JUPITER: { ta: 'குரு', en: 'Ju' },
  VENUS: { ta: 'சுக்', en: 'Ve' },
  SATURN: { ta: 'சனி', en: 'Sa' },
  RAHU: { ta: 'ராகு', en: 'Ra' },
  KETU: { ta: 'கேது', en: 'Ke' },
  LAGNA: { ta: 'ல', en: 'La' },
};

export interface ChartHouseInput {
  houseNo: number;
  signIndex: number;
  occupants: Graha[];
  signName: BilingualLabel;
}

export interface ChartPlanetFlags {
  retrograde: boolean;
  combust: boolean;
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSouthIndianChartSvg(
  lagnaSignIndex: number,
  houses: ChartHouseInput[],
  planetFlags: Record<string, ChartPlanetFlags>,
  language: 'ta' | 'en',
  centerLabel: string,
): string {
  const houseBySign = new Map(houses.map((h) => [h.signIndex, h]));

  const cells = SIGN_GRID_POSITION.map(([row, col], signIndex) => {
    const house = houseBySign.get(signIndex);
    const x = col * CELL;
    const y = row * CELL;
    const isLagna = signIndex === lagnaSignIndex;
    const occupants = house?.occupants ?? [];

    const lagnaMark = isLagna
      ? `<line x1="${x + 4}" y1="${y + 4}" x2="${x + 22}" y2="${y + 22}" stroke="#c0392b" stroke-width="2.5" />
         <text x="${x + 6}" y="${y + 33}" font-size="12" font-weight="bold" fill="#c0392b">${language === 'ta' ? 'ல' : 'La'}</text>`
      : '';

    const houseNoText = house
      ? `<text x="${x + CELL - 6}" y="${y + 15}" text-anchor="end" font-size="11" fill="#aaa">${house.houseNo}</text>`
      : '';

    const signText = `<text x="${x + 6}" y="${y + 15}" font-size="11" fill="#777">${esc(
      language === 'ta' ? house?.signName.ta ?? '' : house?.signName.en ?? '',
    )}</text>`;

    const occupantLines = occupants
      .map((graha, i) => {
        const flags = planetFlags[graha];
        const label = esc(GRAHA_ABBREV[graha]?.[language] ?? graha);
        const retro = flags?.retrograde ? (language === 'ta' ? ' (வ)' : ' (R)') : '';
        const dy = i === 0 ? y + CELL / 2 - occupants.length * 7 + 10 : undefined;
        const color = flags?.combust ? '#c0392b' : '#111';
        return `<tspan x="${x + CELL / 2}" ${dy !== undefined ? `dy="0"` : `dy="16"`} font-size="13" fill="${color}">${label}${retro}</tspan>`;
      })
      .join('');

    const occupantsText =
      occupants.length > 0
        ? `<text x="${x + CELL / 2}" y="${y + CELL / 2 - occupants.length * 7 + 10}" text-anchor="middle">${occupantLines}</text>`
        : '';

    return `<g>${lagnaMark}${houseNoText}${signText}${occupantsText}</g>`;
  }).join('\n');

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="330" height="330" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="none" stroke="#333" stroke-width="2" />
    <line x1="0" y1="${CELL}" x2="${SIZE}" y2="${CELL}" stroke="#333" stroke-width="1.5" />
    <line x1="0" y1="${CELL * 3}" x2="${SIZE}" y2="${CELL * 3}" stroke="#333" stroke-width="1.5" />
    <line x1="${CELL}" y1="0" x2="${CELL}" y2="${SIZE}" stroke="#333" stroke-width="1.5" />
    <line x1="${CELL * 3}" y1="0" x2="${CELL * 3}" y2="${SIZE}" stroke="#333" stroke-width="1.5" />
    <line x1="${CELL * 2}" y1="0" x2="${CELL * 2}" y2="${CELL}" stroke="#333" stroke-width="1.5" />
    <line x1="${CELL * 2}" y1="${CELL * 3}" x2="${CELL * 2}" y2="${SIZE}" stroke="#333" stroke-width="1.5" />
    <line x1="0" y1="${CELL * 2}" x2="${CELL}" y2="${CELL * 2}" stroke="#333" stroke-width="1.5" />
    <line x1="${CELL * 3}" y1="${CELL * 2}" x2="${SIZE}" y2="${CELL * 2}" stroke="#333" stroke-width="1.5" />
    <text x="${SIZE / 2}" y="${SIZE / 2}" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#aaa">${esc(centerLabel)}</text>
    ${cells}
  </svg>`;
}
