import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

describe('Dasha (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jathakamId: string;
  let profileId: string;
  let auth: TestAuth;

  const profilePayload = {
    name: 'Dasha E2E Profile',
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
    auth = await registerTestUser(app, 'dasha');

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

  it('persists a full Maha/Antar/Pratyantar tree covering at least 120 years', async () => {
    const counts = await prisma.dasha.groupBy({
      by: ['level'],
      where: { jathakamId },
      _count: { _all: true },
    });
    const countOf = (level: string) => counts.find((c) => c.level === level)?._count._all ?? 0;
    expect(countOf('MAHA')).toBeGreaterThanOrEqual(9);
    expect(countOf('ANTAR')).toBeGreaterThanOrEqual(80);
    expect(countOf('PRATYANTAR')).toBeGreaterThanOrEqual(700);
  });

  it('returns past/current/next at all three levels for a mid-life asOf date', async () => {
    // Person born 1990-01-15; query as of 2010-01-15 (age 20) — comfortably
    // inside the generated 130-year coverage window.
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/dasha`)
      .set(...authHeader(auth))
      .query({ asOf: '2010-01-15' })
      .expect(200);

    for (const level of ['mahadasha', 'antardasha', 'pratyantardasha'] as const) {
      const summary = res.body[level];
      expect(summary.current).not.toBeNull();
      expect(new Date(summary.current.startDate).getTime()).toBeLessThanOrEqual(new Date('2010-01-15').getTime());
      expect(new Date(summary.current.endDate).getTime()).toBeGreaterThan(new Date('2010-01-15').getTime());
    }

    // mahadashaList: full timeline, each entry carries its 9 (or fewer, for
    // the birth-truncated first one) antardashas.
    expect(res.body.mahadashaList.length).toBeGreaterThanOrEqual(9);
    for (const maha of res.body.mahadashaList) {
      expect(maha.antardashas.length).toBeGreaterThan(0);
      expect(maha.antardashas.length).toBeLessThanOrEqual(9);
    }
  });

  it('the current Mahadasha at birth matches the Moon nakshatra lord', async () => {
    const jathakamRes = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}`)
      .set(...authHeader(auth))
      .expect(200);
    const moonNakshatra = jathakamRes.body.rasi.nakshatra;

    // A day after birth, not the birth date itself — midnight UTC on the
    // birth date is technically before the actual birth instant (08:30 IST
    // = 03:00 UTC that same day).
    const dashaRes = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/dasha`)
      .set(...authHeader(auth))
      .query({ asOf: '1990-01-16' })
      .expect(200);

    // Nakshatra lord cycles through KETU,VENUS,SUN,MOON,MARS,RAHU,JUPITER,SATURN,MERCURY
    const order = ['KETU', 'VENUS', 'SUN', 'MOON', 'MARS', 'RAHU', 'JUPITER', 'SATURN', 'MERCURY'];
    const expectedLord = order[(moonNakshatra - 1) % 9];
    expect(dashaRes.body.mahadasha.current.graha).toBe(expectedLord);
  });

  it('404s for an unknown jathakam id', async () => {
    await request(app.getHttpServer())
      .get('/jathakams/00000000-0000-0000-0000-000000000000/dasha')
      .set(...authHeader(auth))
      .expect(404);
  });

  it('400s for an invalid asOf date', async () => {
    await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/dasha`)
      .set(...authHeader(auth))
      .query({ asOf: 'not-a-date' })
      .expect(400);
  });

  it("404s (not 403) when another user requests this jathakam's dasha", async () => {
    const otherUser = await registerTestUser(app, 'dasha-other');
    try {
      await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/dasha`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });
});
