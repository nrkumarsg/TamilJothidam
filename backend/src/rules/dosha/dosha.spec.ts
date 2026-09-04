import { sevvaiDosham } from './sevvai-dosham';
import { kalaSarpaDosha } from './kala-sarpa-dosha';
import { pitruDosha } from './pitru-dosha';
import { grahanaDosha } from './grahana-dosha';
import { DoshaChartHouse, DoshaChartInput, DoshaChartPlanet } from './dosha.types';

function chart(planets: DoshaChartPlanet[] = [], houses: DoshaChartHouse[] = []): DoshaChartInput {
  return { planets, houses };
}

function planet(graha: DoshaChartPlanet['graha'], longitude: number, house: number): DoshaChartPlanet {
  return { graha, longitude, signIndex: Math.floor(longitude / 30), house };
}

describe('sevvaiDosham', () => {
  it('flags Mars in house 7 as STRONG', () => {
    const result = sevvaiDosham.evaluate(chart([planet('MARS', 0, 7)]));
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('STRONG');
    expect(result!.ruleTriggered).toContain('house 7');
  });

  it('flags Mars in house 2 as LOW', () => {
    const result = sevvaiDosham.evaluate(chart([planet('MARS', 0, 2)]));
    expect(result!.severity).toBe('LOW');
  });

  it('finds nothing when Mars is outside the flagged houses', () => {
    expect(sevvaiDosham.evaluate(chart([planet('MARS', 0, 5)]))).toBeNull();
  });
});

describe('kalaSarpaDosha', () => {
  it('detects the dosha when all 7 classical grahas are hemmed on one side of the nodal axis', () => {
    // Rahu at 0°, Ketu at 180°. All 7 classical grahas placed between
    // 10° and 170° — strictly within the forward (Rahu -> Ketu) arc.
    const planets: DoshaChartPlanet[] = [
      planet('RAHU', 0, 1),
      planet('KETU', 180, 7),
      planet('SUN', 20, 1),
      planet('MOON', 50, 2),
      planet('MARS', 80, 3),
      planet('MERCURY', 100, 4),
      planet('JUPITER', 120, 4),
      planet('VENUS', 140, 5),
      planet('SATURN', 160, 6),
    ];
    const result = kalaSarpaDosha.evaluate(chart(planets));
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('STRONG');
  });

  it('finds nothing when even one graha falls on the other side of the nodal axis', () => {
    // Same as the positive case, except Saturn sits at 190° — just past
    // Ketu (180°), on the opposite arc from the other 6 grahas (all < 180°
    // from Rahu). Neither "all forward" nor "all backward" holds.
    const planets: DoshaChartPlanet[] = [
      planet('RAHU', 0, 1),
      planet('KETU', 180, 7),
      planet('SUN', 20, 1),
      planet('MOON', 50, 2),
      planet('MARS', 80, 3),
      planet('MERCURY', 100, 4),
      planet('JUPITER', 120, 4),
      planet('VENUS', 140, 5),
      planet('SATURN', 190, 7),
    ];
    expect(kalaSarpaDosha.evaluate(chart(planets))).toBeNull();
  });
});

describe('pitruDosha', () => {
  it('flags Sun conjunct Rahu as STRONG', () => {
    const planets = [planet('SUN', 10, 3), planet('RAHU', 10, 3), planet('KETU', 190, 9)];
    const result = pitruDosha.evaluate(chart(planets));
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('STRONG');
  });

  it('flags a node in the 9th house as MODERATE', () => {
    const planets = [planet('SUN', 10, 3), planet('RAHU', 100, 9), planet('KETU', 280, 5)];
    const result = pitruDosha.evaluate(chart(planets));
    expect(result).not.toBeNull();
    expect(result!.severity).toBe('MODERATE');
    expect(result!.ruleTriggered).toContain('9th house');
  });

  it('flags the 9th lord conjunct a node as MODERATE', () => {
    const planets = [
      planet('SUN', 10, 3),
      planet('RAHU', 50, 5),
      planet('KETU', 230, 11),
      planet('JUPITER', 50, 5), // 9th lord, conjunct Rahu
    ];
    const houses: DoshaChartHouse[] = [{ houseNo: 9, lord: 'JUPITER', lordHouse: 5 }];
    const result = pitruDosha.evaluate(chart(planets, houses));
    expect(result).not.toBeNull();
    expect(result!.ruleTriggered).toContain('9th lord');
  });

  it('finds nothing when none of the conditions hold', () => {
    const planets = [
      planet('SUN', 10, 3),
      planet('RAHU', 50, 5),
      planet('KETU', 230, 11),
      planet('JUPITER', 300, 10),
    ];
    const houses: DoshaChartHouse[] = [{ houseNo: 9, lord: 'JUPITER', lordHouse: 10 }];
    expect(pitruDosha.evaluate(chart(planets, houses))).toBeNull();
  });
});

describe('grahanaDosha', () => {
  it('flags Sun conjunct Ketu as STRONG', () => {
    const planets = [planet('SUN', 10, 3), planet('MOON', 100, 6), planet('RAHU', 200, 8), planet('KETU', 10, 3)];
    const result = grahanaDosha.evaluate(chart(planets));
    expect(result!.severity).toBe('STRONG');
  });

  it('flags Moon conjunct Rahu as MODERATE', () => {
    const planets = [planet('SUN', 10, 3), planet('MOON', 200, 8), planet('RAHU', 200, 8), planet('KETU', 20, 11)];
    const result = grahanaDosha.evaluate(chart(planets));
    expect(result!.severity).toBe('MODERATE');
  });

  it('finds nothing when neither luminary is conjunct a node', () => {
    const planets = [planet('SUN', 10, 3), planet('MOON', 100, 6), planet('RAHU', 200, 8), planet('KETU', 20, 11)];
    expect(grahanaDosha.evaluate(chart(planets))).toBeNull();
  });
});
