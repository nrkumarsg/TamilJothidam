import { buildSouthIndianChartSvg, ChartHouseInput, ChartPlanetFlags } from './rasi-chart-svg';

const HOUSES: ChartHouseInput[] = Array.from({ length: 12 }, (_, i) => ({
  houseNo: i + 1,
  signIndex: i, // house 1 = Mesham (signIndex 0) for this fixture
  occupants: i === 0 ? ['SUN', 'MOON'] : [],
  signName: { ta: `ராசி${i}`, en: `Sign${i}` },
}));

describe('buildSouthIndianChartSvg', () => {
  it('renders a well-formed SVG root element', () => {
    const svg = buildSouthIndianChartSvg(0, HOUSES, {}, 'ta', 'ராசி');
    expect(svg.trim().startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('marks the Lagna sign with the "ல"/"La" label in the requested language', () => {
    const ta = buildSouthIndianChartSvg(0, HOUSES, {}, 'ta', 'ராசி');
    expect(ta).toContain('>ல<');
    const en = buildSouthIndianChartSvg(0, HOUSES, {}, 'en', 'Rasi');
    expect(en).toContain('>La<');
  });

  it('renders occupant graha abbreviations for the correct language', () => {
    const ta = buildSouthIndianChartSvg(0, HOUSES, {}, 'ta', 'ராசி');
    expect(ta).toContain('சூரி');
    expect(ta).toContain('சந்');

    const en = buildSouthIndianChartSvg(0, HOUSES, {}, 'en', 'Rasi');
    expect(en).toContain('>Su<');
    expect(en).toContain('>Mo<');
  });

  it('marks a retrograde graha with the language-appropriate suffix', () => {
    const flags: Record<string, ChartPlanetFlags> = { SUN: { retrograde: true, combust: false } };
    const ta = buildSouthIndianChartSvg(0, HOUSES, flags, 'ta', 'ராசி');
    expect(ta).toContain('(வ)');
    const en = buildSouthIndianChartSvg(0, HOUSES, flags, 'en', 'Rasi');
    expect(en).toContain('(R)');
  });

  it('colors a combust graha in red', () => {
    const flags: Record<string, ChartPlanetFlags> = { SUN: { retrograde: false, combust: true } };
    const svg = buildSouthIndianChartSvg(0, HOUSES, flags, 'ta', 'ராசி');
    expect(svg).toContain('fill="#c0392b"');
  });

  it('escapes the center label to avoid breaking the SVG on special characters', () => {
    const svg = buildSouthIndianChartSvg(0, HOUSES, {}, 'en', 'A & B < C');
    expect(svg).toContain('A &amp; B &lt; C');
    expect(svg).not.toContain('A & B < C');
  });

  it('renders all 12 house numbers', () => {
    const svg = buildSouthIndianChartSvg(0, HOUSES, {}, 'en', 'Rasi');
    for (let houseNo = 1; houseNo <= 12; houseNo++) {
      expect(svg).toContain(`>${houseNo}<`);
    }
  });
});
