'use client';

import { GRAHA_ABBREV } from './graha-labels';

// Fixed cell position for each sign in the traditional South Indian chart
// layout — sign positions never move regardless of Lagna; only which sign
// is "house 1" changes. Aries fixed at (row 0, col 1), then the zodiac
// proceeds clockwise around the 4x4 grid's outer ring; the center 2x2 is
// left as one merged blank area (traditionally holds the chart title).
const SIGN_GRID_POSITION: [row: number, col: number][] = [
  [0, 1], // 0 Mesham / Aries
  [0, 2], // 1 Rishabam / Taurus
  [0, 3], // 2 Mithunam / Gemini
  [1, 3], // 3 Kadagam / Cancer
  [2, 3], // 4 Simmam / Leo
  [3, 3], // 5 Kanni / Virgo
  [3, 2], // 6 Thulam / Libra
  [3, 1], // 7 Viruchigam / Scorpio
  [3, 0], // 8 Dhanusu / Sagittarius
  [2, 0], // 9 Makaram / Capricorn
  [1, 0], // 10 Kumbam / Aquarius
  [0, 0], // 11 Meenam / Pisces
];

const CELL = 110;
const SIZE = CELL * 4;

export interface ChartHouse {
  houseNo: number;
  signIndex: number;
  occupants: string[];
  signName: { ta: string; en: string };
}

export interface ChartPlanetFlags {
  retrograde: boolean;
  combust: boolean;
}

interface Props {
  lagnaSignIndex: number;
  houses: ChartHouse[];
  planetFlags: Record<string, ChartPlanetFlags>;
  language: 'ta' | 'en';
  centerLabel?: string;
}

export function SouthIndianChart({ lagnaSignIndex, houses, planetFlags, language, centerLabel }: Props) {
  const houseBySign = new Map(houses.map((h) => [h.signIndex, h]));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: 440, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={language === 'ta' ? 'ராசி கட்டம்' : 'Rasi chart'}
    >
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="none" stroke="#333" strokeWidth={2} />

      {/* Boundaries between the outer ring and the merged center block */}
      <line x1={0} y1={CELL} x2={SIZE} y2={CELL} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={CELL * 3} x2={SIZE} y2={CELL * 3} stroke="#333" strokeWidth={1.5} />
      <line x1={CELL} y1={0} x2={CELL} y2={SIZE} stroke="#333" strokeWidth={1.5} />
      <line x1={CELL * 3} y1={0} x2={CELL * 3} y2={SIZE} stroke="#333" strokeWidth={1.5} />

      {/* Dividers within the top/bottom rows and left/right columns only —
          the 2x2 center stays open (no line drawn through the middle). */}
      <line x1={CELL * 2} y1={0} x2={CELL * 2} y2={CELL} stroke="#333" strokeWidth={1.5} />
      <line x1={CELL * 2} y1={CELL * 3} x2={CELL * 2} y2={SIZE} stroke="#333" strokeWidth={1.5} />
      <line x1={0} y1={CELL * 2} x2={CELL} y2={CELL * 2} stroke="#333" strokeWidth={1.5} />
      <line x1={CELL * 3} y1={CELL * 2} x2={SIZE} y2={CELL * 2} stroke="#333" strokeWidth={1.5} />

      <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle" dominantBaseline="middle" fontSize={16} fill="#aaa">
        {centerLabel ?? (language === 'ta' ? 'ராசி' : 'Rasi')}
      </text>

      {SIGN_GRID_POSITION.map(([row, col], signIndex) => {
        const house = houseBySign.get(signIndex);
        const x = col * CELL;
        const y = row * CELL;
        const isLagna = signIndex === lagnaSignIndex;
        const occupants = house?.occupants ?? [];

        return (
          <g key={signIndex}>
            {isLagna && (
              <>
                <line x1={x + 4} y1={y + 4} x2={x + 22} y2={y + 22} stroke="#c0392b" strokeWidth={2.5} />
                <text x={x + 6} y={y + 33} fontSize={12} fontWeight="bold" fill="#c0392b">
                  {language === 'ta' ? 'ல' : 'La'}
                </text>
              </>
            )}

            {house && (
              <text x={x + CELL - 6} y={y + 15} textAnchor="end" fontSize={11} fill="#aaa">
                {house.houseNo}
              </text>
            )}

            <text x={x + 6} y={y + 15} fontSize={11} fill="#777">
              {language === 'ta' ? house?.signName.ta : house?.signName.en}
            </text>

            <text x={x + CELL / 2} y={y + CELL / 2 - occupants.length * 7 + 10} textAnchor="middle">
              {occupants.map((graha, i) => {
                const flags = planetFlags[graha];
                const label = GRAHA_ABBREV[graha]?.[language] ?? graha;
                return (
                  <tspan
                    key={graha}
                    x={x + CELL / 2}
                    dy={i === 0 ? 0 : 16}
                    fontSize={13}
                    fill={flags?.combust ? '#c0392b' : '#111'}
                  >
                    {label}
                    {flags?.retrograde ? (language === 'ta' ? ' (வ)' : ' (R)') : ''}
                  </tspan>
                );
              })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
