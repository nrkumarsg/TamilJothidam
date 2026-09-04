import { rajaYoga } from './raja-yoga';
import { dhanaYoga } from './dhana-yoga';
import { gajaKesariYoga } from './gaja-kesari-yoga';
import { budhaAdityaYoga } from './budha-aditya-yoga';
import { neechaBhangaRajaYoga } from './neecha-bhanga-raja-yoga';
import { dharmaKarmaAdhipatiYoga } from './dharma-karma-adhipati-yoga';
import { vipareetaRajaYoga } from './vipareeta-raja-yoga';
import { chandraMangalaYoga } from './chandra-mangala-yoga';
import { YogaChartHouse, YogaChartInput, YogaChartPlanet } from './yoga.types';

// Each rule reads only the slice of the chart it needs (documented in its
// own file); tests build minimal charts covering just that slice.
function chart(houses: YogaChartHouse[] = [], planets: YogaChartPlanet[] = []): YogaChartInput {
  return { houses, planets };
}

function planet(graha: YogaChartPlanet['graha'], signIndex: number, house: number, dignity: YogaChartPlanet['dignity'] = null): YogaChartPlanet {
  return { graha, signIndex, house, dignity };
}

describe('rajaYoga', () => {
  it('detects a connection between a kendra lord and a trikona lord (conjunction)', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 1, signIndex: 9, lord: 'SATURN', lordHouse: 11 },
      { houseNo: 4, signIndex: 0, lord: 'MARS', lordHouse: 3 },
      { houseNo: 5, signIndex: 1, lord: 'MERCURY', lordHouse: 11 }, // conjunct with house 1's lord at house 11
      { houseNo: 7, signIndex: 3, lord: 'VENUS', lordHouse: 9 },
      { houseNo: 9, signIndex: 5, lord: 'JUPITER', lordHouse: 6 },
      { houseNo: 10, signIndex: 6, lord: 'MARS', lordHouse: 8 },
    ];
    const result = rajaYoga.evaluate(chart(houses));
    expect(result).not.toBeNull();
    expect(result!.participatingPlanets).toEqual(expect.arrayContaining(['SATURN', 'MERCURY']));
    expect(result!.participatingHouses).toEqual(expect.arrayContaining([1, 5]));
    expect(result!.strength).toBe('STRONG');
  });

  it('finds no Raja Yoga when every kendra/trikona house shares the same lord', () => {
    const houses: YogaChartHouse[] = [1, 4, 5, 7, 9, 10].map((houseNo) => ({
      houseNo,
      signIndex: 0,
      lord: 'SUN',
      lordHouse: houseNo, // irrelevant, same-lord pairs are skipped before this is checked
    }));
    expect(rajaYoga.evaluate(chart(houses))).toBeNull();
  });
});

describe('dhanaYoga', () => {
  it('detects a 2nd/11th lord conjunction', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 2, signIndex: 1, lord: 'VENUS', lordHouse: 7 },
      { houseNo: 11, signIndex: 7, lord: 'MARS', lordHouse: 7 },
    ];
    const result = dhanaYoga.evaluate(chart(houses));
    expect(result).not.toBeNull();
    expect(result!.participatingPlanets.sort()).toEqual(['MARS', 'VENUS']);
    expect(result!.participatingHouses).toEqual([2, 11]);
    expect(result!.strength).toBe('STRONG');
  });

  it('finds nothing when the 2nd and 11th lords are unconnected', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 2, signIndex: 1, lord: 'VENUS', lordHouse: 1 },
      { houseNo: 11, signIndex: 7, lord: 'MARS', lordHouse: 3 },
    ];
    expect(dhanaYoga.evaluate(chart(houses))).toBeNull();
  });

  it('finds nothing when the same planet lords both houses (no real second significator)', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 2, signIndex: 1, lord: 'VENUS', lordHouse: 4 },
      { houseNo: 11, signIndex: 6, lord: 'VENUS', lordHouse: 4 },
    ];
    expect(dhanaYoga.evaluate(chart(houses))).toBeNull();
  });
});

describe('dharmaKarmaAdhipatiYoga', () => {
  it('detects a 9th/10th lord exchange (parivartana)', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 9, signIndex: 8, lord: 'JUPITER', lordHouse: 10 },
      { houseNo: 10, signIndex: 9, lord: 'SATURN', lordHouse: 9 },
    ];
    const result = dharmaKarmaAdhipatiYoga.evaluate(chart(houses));
    expect(result).not.toBeNull();
    expect(result!.participatingPlanets.sort()).toEqual(['JUPITER', 'SATURN']);
    expect(result!.strength).toBe('STRONG'); // exchange counts as a tight connection
  });

  it('finds nothing when unconnected', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 9, signIndex: 8, lord: 'JUPITER', lordHouse: 2 },
      { houseNo: 10, signIndex: 9, lord: 'SATURN', lordHouse: 4 },
    ];
    expect(dharmaKarmaAdhipatiYoga.evaluate(chart(houses))).toBeNull();
  });
});

describe('gajaKesariYoga', () => {
  it('detects Jupiter in a kendra from Moon', () => {
    const planets = [planet('MOON', 3, 4), planet('JUPITER', 3, 4)]; // Jupiter conjunct Moon = house 1 from Moon
    const result = gajaKesariYoga.evaluate(chart([], planets));
    expect(result).not.toBeNull();
    expect(result!.strength).toBe('STRONG');
  });

  it('finds nothing when Jupiter is not in a kendra from Moon', () => {
    const planets = [planet('MOON', 0, 1), planet('JUPITER', 1, 2)]; // 2nd from Moon
    expect(gajaKesariYoga.evaluate(chart([], planets))).toBeNull();
  });
});

describe('budhaAdityaYoga', () => {
  it('detects Sun-Mercury conjunction', () => {
    const planets = [planet('SUN', 5, 6), planet('MERCURY', 5, 6)];
    expect(budhaAdityaYoga.evaluate(chart([], planets))).not.toBeNull();
  });

  it('finds nothing when Sun and Mercury are in different houses', () => {
    const planets = [planet('SUN', 5, 6), planet('MERCURY', 6, 7)];
    expect(budhaAdityaYoga.evaluate(chart([], planets))).toBeNull();
  });
});

describe('chandraMangalaYoga', () => {
  it('detects Moon-Mars conjunction', () => {
    const planets = [planet('MOON', 2, 3), planet('MARS', 2, 3)];
    expect(chandraMangalaYoga.evaluate(chart([], planets))).not.toBeNull();
  });

  it('finds nothing when Moon and Mars are apart', () => {
    const planets = [planet('MOON', 2, 3), planet('MARS', 7, 8)];
    expect(chandraMangalaYoga.evaluate(chart([], planets))).toBeNull();
  });
});

describe('neechaBhangaRajaYoga', () => {
  it('detects cancellation when the dispositor sits in a kendra from Lagna', () => {
    // Mars is debilitated in Cancer (signIndex 3). Cancer's lord is the Moon.
    // Place the Moon in house 4 (a kendra from Lagna) to cancel the debilitation.
    const planets = [
      planet('MARS', 3, 8, 'DEBILITATED'),
      planet('MOON', 5, 4),
    ];
    const result = neechaBhangaRajaYoga.evaluate(chart([], planets));
    expect(result).not.toBeNull();
    expect(result!.participatingPlanets).toEqual(['MARS', 'MOON']);
  });

  it('finds nothing when there is no debilitated planet', () => {
    const planets = [planet('MARS', 0, 1), planet('MOON', 5, 4)];
    expect(neechaBhangaRajaYoga.evaluate(chart([], planets))).toBeNull();
  });

  it('finds nothing when the dispositor is not in a kendra from Lagna', () => {
    const planets = [
      planet('MARS', 3, 8, 'DEBILITATED'), // dispositor = Moon
      planet('MOON', 5, 3), // house 3, not a kendra
    ];
    expect(neechaBhangaRajaYoga.evaluate(chart([], planets))).toBeNull();
  });
});

describe('vipareetaRajaYoga', () => {
  it('detects a dusthana lord placed in a different dusthana house', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 6, signIndex: 2, lord: 'MERCURY', lordHouse: 8 }, // 6th lord in 8th
      { houseNo: 8, signIndex: 4, lord: 'SUN', lordHouse: 1 },
      { houseNo: 12, signIndex: 8, lord: 'JUPITER', lordHouse: 5 },
    ];
    const result = vipareetaRajaYoga.evaluate(chart(houses));
    expect(result).not.toBeNull();
    expect(result!.participatingPlanets).toEqual(['MERCURY']);
    expect(result!.participatingHouses).toEqual([6]);
    expect(result!.strength).toBe('MODERATE');
  });

  it('does not count a dusthana lord placed in its OWN dusthana house', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 6, signIndex: 2, lord: 'MERCURY', lordHouse: 6 },
      { houseNo: 8, signIndex: 4, lord: 'SUN', lordHouse: 1 },
      { houseNo: 12, signIndex: 8, lord: 'JUPITER', lordHouse: 5 },
    ];
    expect(vipareetaRajaYoga.evaluate(chart(houses))).toBeNull();
  });

  it('grades STRONG when more than one dusthana lord qualifies', () => {
    const houses: YogaChartHouse[] = [
      { houseNo: 6, signIndex: 2, lord: 'MERCURY', lordHouse: 8 },
      { houseNo: 8, signIndex: 4, lord: 'SUN', lordHouse: 12 },
      { houseNo: 12, signIndex: 8, lord: 'JUPITER', lordHouse: 3 },
    ];
    const result = vipareetaRajaYoga.evaluate(chart(houses));
    expect(result!.strength).toBe('STRONG');
  });
});
