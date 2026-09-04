import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AiProviderRegistry } from '../../src/ai/providers/ai-provider.registry';
import { AIProvider } from '../../src/ai/providers/ai-provider.interface';
import { authHeader, registerTestUser, TestAuth } from '../helpers/auth';
import { REFERENCE_CHARTS, ReferenceChart, stripVolatileFields } from './reference-charts';

class FakeProvider implements AIProvider {
  readonly id = 'ANTHROPIC' as const;
  async generate() {
    return { text: 'FAKE REGRESSION TEXT', model: 'fake-model' };
  }
}

// Fixed as-of dates so the dasha and transit views are deterministic and
// therefore snapshot-able — without these both would move every day.
const DASHA_AS_OF = '2020-06-15';
const TRANSIT_AS_OF = '2020-06-15';

interface CapturedChart {
  chart: ReferenceChart;
  jathakamId: string;
  jathakam: Record<string, unknown>;
  dasha: Record<string, unknown>;
  transits: Record<string, unknown>;
}

// Phase 19 regression suite, full-pipeline level (spec §38). Runs all six
// reference charts through the REAL production path — HTTP -> profile ->
// jathakam -> calculation -> houses -> navamsa -> yoga/dosha rules ->
// dasha -> transits -> report — rather than re-assembling any of it in the
// test, so what's covered is exactly what production does.
//
// On the golden snapshots, honestly: for CHENNAI_1990 they lock in output
// verified by hand across Phases 4-18 (its Raja Yoga, its two doshas, its
// dasha dates). For the other five charts they lock in CURRENT behaviour so
// any future drift in the engine is caught — that is drift detection, not a
// claim that a human independently confirmed every number. The facts that
// ARE independently checked for all six live in engine-invariants.spec.ts
// (Sun sign from the calendar, node axis, whole-sign house maths) and in
// the invariant blocks below.
describe('Regression: reference charts through the full pipeline', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: TestAuth;
  const captured: CapturedChart[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiProviderRegistry)
      .useValue({ getProvider: () => new FakeProvider() } as unknown as AiProviderRegistry)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    auth = await registerTestUser(app, 'regression');

    for (const chart of REFERENCE_CHARTS) {
      const profileRes = await request(app.getHttpServer())
        .post('/profiles')
        .set(...authHeader(auth))
        .send({
          name: chart.name,
          gender: chart.gender,
          dateOfBirth: chart.dateOfBirth,
          timeOfBirth: chart.timeOfBirth,
          timeAccuracy: chart.timeAccuracy,
          location: chart.location,
        })
        .expect(201);

      const jathakamRes = await request(app.getHttpServer())
        .post('/jathakams')
        .set(...authHeader(auth))
        .send({ profileId: profileRes.body.id })
        .expect(201);

      const dashaRes = await request(app.getHttpServer())
        .get(`/jathakams/${jathakamRes.body.id}/dasha`)
        .set(...authHeader(auth))
        .query({ asOf: DASHA_AS_OF })
        .expect(200);

      const transitRes = await request(app.getHttpServer())
        .get(`/jathakams/${jathakamRes.body.id}/transits`)
        .set(...authHeader(auth))
        .query({ asOf: TRANSIT_AS_OF })
        .expect(200);

      captured.push({
        chart,
        jathakamId: jathakamRes.body.id,
        jathakam: jathakamRes.body,
        dasha: dashaRes.body,
        transits: transitRes.body,
      });
    }
  }, 60000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await app.close();
  });

  function captureFor(key: string): CapturedChart {
    const found = captured.find((c) => c.chart.key === key);
    if (!found) throw new Error(`No captured chart for ${key}`);
    return found;
  }

  describe('golden master — any unintended engine change shows up here', () => {
    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))('%s chart output is unchanged', (key) => {
      expect(stripVolatileFields(captureFor(key).jathakam)).toMatchSnapshot();
    });

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s dasha (as of a fixed date) is unchanged',
      (key) => {
        expect(stripVolatileFields(captureFor(key).dasha)).toMatchSnapshot();
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s transits (as of a fixed date) are unchanged',
      (key) => {
        expect(stripVolatileFields(captureFor(key).transits)).toMatchSnapshot();
      },
    );
  });

  describe('chart structure invariants (must hold for every chart)', () => {
    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))('%s: 12 houses, each sign used exactly once', (key) => {
      const { jathakam } = captureFor(key);
      const houses = jathakam.houses as { houseNo: number; signIndex: number }[];
      expect(houses).toHaveLength(12);
      expect(new Set(houses.map((h) => h.signIndex)).size).toBe(12);
      expect(houses.map((h) => h.houseNo).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))('%s: house 1 carries the Lagna sign', (key) => {
      const { jathakam } = captureFor(key);
      const lagna = jathakam.lagna as { signIndex: number };
      const houses = jathakam.houses as { houseNo: number; signIndex: number }[];
      expect(houses.find((h) => h.houseNo === 1)!.signIndex).toBe(lagna.signIndex);
    });

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: all 9 grahas placed exactly once across the houses',
      (key) => {
        const { jathakam } = captureFor(key);
        const houses = jathakam.houses as { occupants: string[] }[];
        const placed = houses.flatMap((h) => h.occupants);
        expect(placed).toHaveLength(9);
        expect(new Set(placed).size).toBe(9);
        expect(placed).not.toContain('LAGNA');
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: navamsa is a complete second chart with all 9 grahas',
      (key) => {
        const { jathakam } = captureFor(key);
        const navamsa = jathakam.navamsa as {
          lagnaSignIndex: number;
          houses: { houseNo: number; signIndex: number; occupants: string[] }[];
        };
        expect(navamsa.houses).toHaveLength(12);
        expect(navamsa.houses.find((h) => h.houseNo === 1)!.signIndex).toBe(navamsa.lagnaSignIndex);
        expect(navamsa.houses.flatMap((h) => h.occupants)).toHaveLength(9);
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: house analysis agrees with the houses it describes',
      (key) => {
        const { jathakam } = captureFor(key);
        const houses = jathakam.houses as { houseNo: number; lord: string; lordHouse: number; occupants: string[] }[];
        const analysis = jathakam.houseAnalysis as {
          houseNo: number;
          lord: string;
          lordHouse: number;
          occupants: string[];
          conjunction: boolean;
          signification: { ta: string; en: string };
        }[];
        expect(analysis).toHaveLength(12);
        for (const entry of analysis) {
          const house = houses.find((h) => h.houseNo === entry.houseNo)!;
          expect(entry.lord).toBe(house.lord);
          expect(entry.lordHouse).toBe(house.lordHouse);
          expect(entry.occupants).toEqual(house.occupants);
          expect(entry.conjunction).toBe(house.occupants.length >= 2);
        }
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: every detected yoga and dosha is well-formed',
      (key) => {
        const { jathakam } = captureFor(key);
        const yogas = jathakam.yogas as {
          name: string;
          strength: string;
          participatingPlanets: string[];
          participatingHouses: number[];
        }[];
        const doshas = jathakam.doshas as { name: string; severity: string; ruleTriggered: string }[];

        for (const yoga of yogas) {
          expect(yoga.name.length).toBeGreaterThan(0);
          expect(['LOW', 'MODERATE', 'STRONG']).toContain(yoga.strength);
          expect(yoga.participatingPlanets.length).toBeGreaterThan(0);
          expect(yoga.participatingHouses.length).toBeGreaterThan(0);
        }
        for (const dosha of doshas) {
          expect(dosha.name.length).toBeGreaterThan(0);
          expect(['LOW', 'MODERATE', 'STRONG']).toContain(dosha.severity);
          // spec §22: every dosha carries a machine-readable audit string
          // separate from the user-facing description.
          expect(dosha.ruleTriggered.length).toBeGreaterThan(0);
        }
      },
    );
  });

  describe('dasha invariants (must hold for every chart)', () => {
    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: the Mahadasha timeline is gapless, ordered, and spans a full Vimshottari cycle',
      (key) => {
        const { dasha } = captureFor(key);
        const list = dasha.mahadashaList as { graha: string; startDate: string; endDate: string }[];
        expect(list.length).toBeGreaterThanOrEqual(9);

        for (let i = 0; i < list.length; i++) {
          expect(new Date(list[i].endDate).getTime()).toBeGreaterThan(new Date(list[i].startDate).getTime());
          if (i > 0) {
            // Each period begins exactly where the previous one ended — no
            // gaps, no overlaps.
            expect(list[i].startDate).toBe(list[i - 1].endDate);
          }
        }

        const spanYears =
          (new Date(list[list.length - 1].endDate).getTime() - new Date(list[0].startDate).getTime()) /
          (365.2425 * 24 * 60 * 60 * 1000);
        // Vimshottari runs 120 years; the first period is truncated at
        // birth, so a full generated tree covers 120 years plus whatever
        // remains of the cycle beyond it.
        expect(spanYears).toBeGreaterThan(115);
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      "%s: each Mahadasha's antardashas exactly fill their parent",
      (key) => {
        const { dasha } = captureFor(key);
        const list = dasha.mahadashaList as {
          startDate: string;
          endDate: string;
          antardashas: { startDate: string; endDate: string }[];
        }[];

        for (const maha of list) {
          expect(maha.antardashas.length).toBeGreaterThan(0);
          expect(maha.antardashas.length).toBeLessThanOrEqual(9);
          // The first Mahadasha is truncated at birth, so its antardashas
          // start at birth rather than at the notional period start.
          const first = maha.antardashas[0];
          const last = maha.antardashas[maha.antardashas.length - 1];
          expect(new Date(first.startDate).getTime()).toBeGreaterThanOrEqual(new Date(maha.startDate).getTime());

          // Compared with a 2ms tolerance, not exactly: the children are
          // accumulated as fractional Julian Days and jdToDate() rounds to
          // the millisecond, so the last child can land 1ms off its
          // parent's end. dasha.util.spec.ts uses toBeCloseTo(…, 6) on the
          // same property for the same reason. The bound stays tight
          // enough that a genuine gap (seconds, let alone days) still fails.
          const drift = Math.abs(new Date(last.endDate).getTime() - new Date(maha.endDate).getTime());
          expect(drift).toBeLessThanOrEqual(2);

          for (let i = 1; i < maha.antardashas.length; i++) {
            expect(maha.antardashas[i].startDate).toBe(maha.antardashas[i - 1].endDate);
          }
        }
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: the current period at each level actually contains the as-of date',
      (key) => {
        const { dasha } = captureFor(key);
        const asOf = new Date(DASHA_AS_OF).getTime();
        for (const level of ['mahadasha', 'antardasha', 'pratyantardasha'] as const) {
          const current = (dasha[level] as { current: { startDate: string; endDate: string } | null }).current;
          expect(current).not.toBeNull();
          expect(new Date(current!.startDate).getTime()).toBeLessThanOrEqual(asOf);
          expect(new Date(current!.endDate).getTime()).toBeGreaterThan(asOf);
        }
      },
    );

    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: the first Mahadasha lord matches the Moon nakshatra lord',
      (key) => {
        const { jathakam, dasha } = captureFor(key);
        const rasi = jathakam.rasi as { nakshatra: number };
        const list = dasha.mahadashaList as { graha: string }[];
        // Vimshottari's fixed lord cycle, indexed by nakshatra.
        const order = ['KETU', 'VENUS', 'SUN', 'MOON', 'MARS', 'RAHU', 'JUPITER', 'SATURN', 'MERCURY'];
        expect(list[0].graha).toBe(order[(rasi.nakshatra - 1) % 9]);
      },
    );
  });

  describe('transit invariants (must hold for every chart)', () => {
    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: transit flags agree with where Saturn actually is from the Moon',
      (key) => {
        const { transits } = captureFor(key);
        const list = transits.transits as { graha: string; houseFromMoon: number; houseFromLagna: number }[];
        expect(list.map((t) => t.graha).sort()).toEqual(['JUPITER', 'KETU', 'MARS', 'RAHU', 'SATURN']);

        const saturn = list.find((t) => t.graha === 'SATURN')!;
        const sadeSati = transits.sadeSati as { active: boolean; phase: string | null };
        // Sade Sati is Saturn transiting the 12th, 1st or 2nd from the
        // natal Moon; Ashtama Shani the 8th; Janma Shani the 1st.
        expect(sadeSati.active).toBe([12, 1, 2].includes(saturn.houseFromMoon));
        expect(transits.ashtamaShani).toBe(saturn.houseFromMoon === 8);
        expect(transits.janmaShani).toBe(saturn.houseFromMoon === 1);
      },
    );
  });

  describe('Tamil output and language switching (spec §38)', () => {
    it.each(REFERENCE_CHARTS.map((c) => [c.key] as const))(
      '%s: every bilingual label is populated in BOTH Tamil and English',
      (key) => {
        const { jathakam } = captureFor(key);

        // Walks the whole response and checks every {ta, en} pair — so a
        // missing Tamil string anywhere in signs, nakshatras, house
        // significations, yoga or dosha descriptions fails here, for every
        // chart, without having to enumerate the fields by hand.
        const missing: string[] = [];
        const visit = (value: unknown, path: string) => {
          if (Array.isArray(value)) {
            value.forEach((v, i) => visit(v, `${path}[${i}]`));
            return;
          }
          if (value !== null && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            if ('ta' in obj && 'en' in obj) {
              if (typeof obj.ta !== 'string' || obj.ta.trim().length === 0) missing.push(`${path}.ta`);
              if (typeof obj.en !== 'string' || obj.en.trim().length === 0) missing.push(`${path}.en`);
              return;
            }
            for (const [k, v] of Object.entries(obj)) visit(v, `${path}.${k}`);
          }
        };
        visit(jathakam, 'jathakam');

        expect(missing).toEqual([]);
      },
    );

    it('renders the 34-section report in Tamil and English, with the same structure either way', async () => {
      const { jathakamId } = captureFor('chennai-1990');

      const tamil = await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/report`)
        .set(...authHeader(auth))
        .query({ language: 'TA' })
        .expect(200);
      const english = await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/report`)
        .set(...authHeader(auth))
        .query({ language: 'EN' })
        .expect(200);

      expect(tamil.body.sections).toHaveLength(34);
      expect(english.body.sections).toHaveLength(34);

      // Same sections, same order, same availability — only the language
      // of the rendered titles differs.
      expect(english.body.sections.map((s: { slug: string }) => s.slug)).toEqual(
        tamil.body.sections.map((s: { slug: string }) => s.slug),
      );
      expect(english.body.sections.map((s: { status: string }) => s.status)).toEqual(
        tamil.body.sections.map((s: { status: string }) => s.status),
      );

      // And the Tamil titles really are Tamil, not English fallbacks.
      const tamilTitles = tamil.body.sections.map((s: { title: { ta: string } }) => s.title.ta);
      expect(tamilTitles).toContain('ஜாதகத்தின் சுருக்கம்');
      for (const title of tamilTitles) {
        expect(title).toMatch(/[஀-௿]/); // at least one Tamil codepoint
      }
    });
  });

  describe('the canonical chart still matches what was verified by hand', () => {
    // These exact facts were derived by hand in Phases 11 and 12 BEFORE the
    // code was trusted — re-asserted here so the regression suite carries
    // the human-verified anchor, not just self-consistency.
    it('chennai-1990 detects exactly one Raja Yoga, from two independent lord conjunctions', () => {
      const { jathakam } = captureFor('chennai-1990');
      const yogas = jathakam.yogas as {
        name: string;
        strength: string;
        participatingPlanets: string[];
        participatingHouses: number[];
      }[];

      expect(yogas).toHaveLength(1);
      expect(yogas[0].name).toBe('Raja Yoga');
      expect(yogas[0].strength).toBe('STRONG');
      expect([...yogas[0].participatingPlanets].sort()).toEqual(['MERCURY', 'SATURN', 'SUN', 'VENUS']);
      expect([...yogas[0].participatingHouses].sort((a, b) => a - b)).toEqual([1, 5, 7, 9]);
    });

    it('chennai-1990 detects Pitru Dosha and Grahana Dosha, both from the same Sun-Rahu conjunction', () => {
      const { jathakam } = captureFor('chennai-1990');
      const doshas = jathakam.doshas as { name: string; severity: string; ruleTriggered: string }[];

      expect(doshas.map((d) => d.name).sort()).toEqual(['Grahana Dosha', 'Pitru Dosha']);
      for (const dosha of doshas) {
        expect(dosha.severity).toBe('STRONG');
        expect(dosha.ruleTriggered).toContain('Sun conjunct Rahu in house 12');
      }
    });
  });
});
