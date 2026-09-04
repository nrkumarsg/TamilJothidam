import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

describe('Transits (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jathakamId: string;
  let profileId: string;
  let auth: TestAuth;

  const profilePayload = {
    name: 'Transits E2E Profile',
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
    auth = await registerTestUser(app, 'transits');

    const profileRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(auth))
      .send(profilePayload)
      .expect(201);
    profileId = profileRes.body.id;
    const jathakamRes = await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(auth))
      .send({ profileId })
      .expect(201);
    jathakamId = jathakamRes.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await app.close();
  });

  it('returns all 5 transit grahas with sign, house-from-Moon and house-from-Lagna', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/transits`)
      .set(...authHeader(auth))
      .query({ asOf: '2026-09-03' })
      .expect(200);

    const grahas = res.body.transits.map((t: { graha: string }) => t.graha);
    expect(grahas.sort()).toEqual(['JUPITER', 'KETU', 'MARS', 'RAHU', 'SATURN'].sort());

    for (const t of res.body.transits) {
      expect(t.signIndex).toBeGreaterThanOrEqual(0);
      expect(t.signIndex).toBeLessThanOrEqual(11);
      expect(t.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(t.houseFromMoon).toBeLessThanOrEqual(12);
      expect(t.houseFromLagna).toBeGreaterThanOrEqual(1);
      expect(t.houseFromLagna).toBeLessThanOrEqual(12);
    }
  });

  it('flags Sade Sati/Ashtama Shani/Janma Shani consistently with the Saturn transit house from Moon', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/transits`)
      .set(...authHeader(auth))
      .query({ asOf: '2026-09-03' })
      .expect(200);

    const saturn = res.body.transits.find((t: { graha: string }) => t.graha === 'SATURN');
    const houseFromMoon = saturn.houseFromMoon;

    const expectedSadeSati = [12, 1, 2].includes(houseFromMoon);
    expect(res.body.sadeSati.active).toBe(expectedSadeSati);
    expect(res.body.ashtamaShani).toBe(houseFromMoon === 8);
    expect(res.body.janmaShani).toBe(houseFromMoon === 1);
    if (res.body.janmaShani) {
      expect(res.body.sadeSati.phase).toBe('PEAK');
    }
  });

  it('Ketu is always exactly opposite Rahu, even in transit', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/transits`)
      .set(...authHeader(auth))
      .query({ asOf: '2026-09-03' })
      .expect(200);

    const rahu = res.body.transits.find((t: { graha: string }) => t.graha === 'RAHU');
    const ketu = res.body.transits.find((t: { graha: string }) => t.graha === 'KETU');
    expect((rahu.signIndex + 6) % 12).toBe(ketu.signIndex);
  });

  it('404s for an unknown jathakam id', async () => {
    await request(app.getHttpServer())
      .get('/jathakams/00000000-0000-0000-0000-000000000000/transits')
      .set(...authHeader(auth))
      .expect(404);
  });

  it('400s for an invalid asOf date', async () => {
    await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/transits`)
      .set(...authHeader(auth))
      .query({ asOf: 'not-a-date' })
      .expect(400);
  });

  it("404s (not 403) when another user requests this jathakam's transits", async () => {
    const otherUser = await registerTestUser(app, 'transits-other');
    try {
      await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/transits`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });
});
