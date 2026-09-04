import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

describe('Jathakam (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let profileId: string;
  let auth: TestAuth;

  const profilePayload = {
    name: 'Jathakam E2E Profile',
    gender: 'MALE',
    dateOfBirth: '1990-01-15',
    timeOfBirth: '08:30',
    timeAccuracy: 'EXACT',
    location: {
      placeName: 'Chennai, Tamil Nadu, India',
      country: 'India',
      latitude: 13.0827,
      longitude: 80.2707,
      timezone: 'Asia/Kolkata',
      utcOffsetMinutes: 330,
      dstApplicable: false,
      manuallyCorrected: false,
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    auth = await registerTestUser(app, 'jathakam');

    const profileRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(auth))
      .send(profilePayload)
      .expect(201);
    profileId = profileRes.body.id;
  });

  afterAll(async () => {
    // Cascades through the profile to its jathakam and everything under
    // it; deleting the throwaway user this file created is enough (see
    // profiles.e2e-spec.ts — no longer a shared dev-local user post-auth).
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await app.close();
  });

  it('creates a jathakam with Lagna + 9 grahas and 12 whole-sign houses', async () => {
    const res = await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(auth))
      .send({ profileId })
      .expect(201);

    expect(res.body.lagna).not.toBeNull();
    expect(res.body.lagna.graha).toBe('LAGNA');
    expect(res.body.lagna.signName.en).toBeTruthy();
    expect(res.body.rasi).not.toBeNull();
    expect(res.body.rasi.graha).toBe('MOON');

    expect(res.body.planets).toHaveLength(10); // 9 grahas + Lagna
    expect(res.body.houses).toHaveLength(12);

    // House 1's sign must match the Lagna's sign (whole-sign houses).
    const house1 = res.body.houses.find((h: { houseNo: number }) => h.houseNo === 1);
    expect(house1.signIndex).toBe(res.body.lagna.signIndex);
    expect(house1.signName.ta).toBe(res.body.lagna.signName.ta);

    // Every one of the 9 real grahas (not Lagna) is placed in exactly one house.
    const totalOccupants = res.body.houses.reduce(
      (sum: number, h: { occupants: string[] }) => sum + h.occupants.length,
      0,
    );
    expect(totalOccupants).toBe(9);

    // Navamsa (D9): same shape as the D1 houses, independently placed.
    expect(res.body.navamsa).not.toBeNull();
    expect(res.body.navamsa.houses).toHaveLength(12);
    const navamsaHouse1 = res.body.navamsa.houses.find((h: { houseNo: number }) => h.houseNo === 1);
    expect(navamsaHouse1.signIndex).toBe(res.body.navamsa.lagnaSignIndex);
    const navamsaOccupants = res.body.navamsa.houses.reduce(
      (sum: number, h: { occupants: string[] }) => sum + h.occupants.length,
      0,
    );
    expect(navamsaOccupants).toBe(9);

    // House analysis (Phase 8): 12 entries, each with a fixed classical
    // signification, and every entry's lord/lordHouse/occupants matches
    // the corresponding houses[] entry exactly.
    expect(res.body.houseAnalysis).toHaveLength(12);
    for (const entry of res.body.houseAnalysis) {
      const matchingHouse = res.body.houses.find((h: { houseNo: number }) => h.houseNo === entry.houseNo);
      expect(entry.lord).toBe(matchingHouse.lord);
      expect(entry.lordHouse).toBe(matchingHouse.lordHouse);
      expect(entry.occupants).toEqual(matchingHouse.occupants);
      expect(entry.conjunction).toBe(matchingHouse.occupants.length >= 2);
      expect(entry.signification.ta.length).toBeGreaterThan(0);
    }

    // Lagna's own aspectsHouses should include house 7 (universal 7th-house
    // drishit applies to every graha, and Lagna sits in house 1 -> house 7
    // is NOT applicable since Lagna casts no drishti; check a real graha
    // instead: whichever planet sits in house 1 aspects house 7).
    const planetInHouse1 = res.body.planets.find(
      (p: { house: number; graha: string }) => p.house === 1 && p.graha !== 'LAGNA',
    );
    if (planetInHouse1) {
      expect(planetInHouse1.aspectsHouses).toContain(7);
    }

    // Yoga engine (Phase 11): for this exact known reference chart, hand
    // analysis (see docs/README Phase 11 entry) finds Raja Yoga twice over
    // — house 1's lord (Saturn) conjunct house 5's lord (Mercury) in house
    // 11, and house 7's lord (Sun) conjunct house 9's lord (Venus) in
    // house 12 — and none of the other 7 yogas. This is a real
    // hand-verified expectation, not a placeholder.
    expect(res.body.yogas).toHaveLength(1);
    const yoga = res.body.yogas[0];
    expect(yoga.name).toBe('Raja Yoga');
    expect(yoga.strength).toBe('STRONG');
    expect(yoga.participatingPlanets.sort()).toEqual(['MERCURY', 'SATURN', 'SUN', 'VENUS'].sort());
    expect(yoga.participatingHouses.sort((a: number, b: number) => a - b)).toEqual([1, 5, 7, 9]);
    expect(yoga.description.ta.length).toBeGreaterThan(0);

    // Dosha engine (Phase 12): hand analysis for this exact chart — Sun
    // (house 12) and Rahu (house 12) are conjunct, which fires BOTH Pitru
    // Dosha and Grahana Dosha (documented intentional overlap — see
    // rules/dosha/grahana-dosha.ts). Mars sits in house 10, outside the
    // Sevvai Dosham house set {1,2,4,7,8,12}, so that stays silent. Kala
    // Sarpa Dosha also stays silent: 6 of the 7 classical grahas are hemmed
    // on one side of the Rahu-Ketu axis but Jupiter breaks the pattern
    // (a genuine near-miss, not a trivial negative case).
    expect(res.body.doshas).toHaveLength(2);
    const doshaNames = res.body.doshas.map((d: { name: string }) => d.name).sort();
    expect(doshaNames).toEqual(['Grahana Dosha', 'Pitru Dosha']);
    for (const dosha of res.body.doshas) {
      expect(dosha.severity).toBe('STRONG');
      expect(dosha.ruleTriggered).toContain('Sun conjunct Rahu in house 12');
      expect(dosha.description.ta.length).toBeGreaterThan(0);
    }
  });

  it('rejects an unknown profileId', async () => {
    await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(auth))
      .send({ profileId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
  });

  it('reads a jathakam back by id and lists jathakams for a profile', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(auth))
      .send({ profileId })
      .expect(201);
    const id = createRes.body.id;

    const getRes = await request(app.getHttpServer())
      .get(`/jathakams/${id}`)
      .set(...authHeader(auth))
      .expect(200);
    expect(getRes.body.id).toBe(id);

    const listRes = await request(app.getHttpServer())
      .get(`/jathakams/profile/${profileId}`)
      .set(...authHeader(auth))
      .expect(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(2); // this test + the previous one
    expect(listRes.body.every((j: { profileId: string }) => j.profileId === profileId)).toBe(true);
  });

  it("404s (not 403) when another user requests this jathakam", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(auth))
      .send({ profileId })
      .expect(201);

    const otherUser = await registerTestUser(app, 'jathakam-other');
    try {
      await request(app.getHttpServer())
        .get(`/jathakams/${createRes.body.id}`)
        .set(...authHeader(otherUser))
        .expect(404);

      // Cannot even create a jathakam from a profileId that isn't theirs.
      await request(app.getHttpServer())
        .post('/jathakams')
        .set(...authHeader(otherUser))
        .send({ profileId })
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });
});
