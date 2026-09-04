import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiProviderRegistry } from '../src/ai/providers/ai-provider.registry';
import { AIProvider } from '../src/ai/providers/ai-provider.interface';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

class FakeProvider implements AIProvider {
  readonly id = 'ANTHROPIC' as const;
  async generate() {
    return { text: 'FAKE REPORT TEXT', model: 'fake-model' };
  }
}

describe('Report (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jathakamId: string;
  let profileId: string;
  let auth: TestAuth;

  const profilePayload = {
    name: 'Report E2E Profile',
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
    const fakeRegistry = { getProvider: () => new FakeProvider() } as unknown as AiProviderRegistry;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiProviderRegistry)
      .useValue(fakeRegistry)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    auth = await registerTestUser(app, 'report');

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

  it('returns all 34 spec §28 sections, numbered 1-34 in order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .expect(200);

    expect(res.body.jathakamId).toBe(jathakamId);
    expect(res.body.language).toBe('TA');
    expect(res.body.sections).toHaveLength(34);
    res.body.sections.forEach((section: { id: number }, index: number) => {
      expect(section.id).toBe(index + 1);
    });
  });

  it('classifies the 11 already-computed chart sections as chart_data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .expect(200);
    const chartSlugs = [
      'lagna_rasi', 'nakshatra_pada', 'planetary_positions', 'rasi_chart', 'navamsa_chart',
      'house_analysis', 'yogas', 'doshas', 'vimshottari_dasha', 'current_dasha', 'transit_results',
    ];
    for (const slug of chartSlugs) {
      const section = res.body.sections.find((s: { slug: string }) => s.slug === slug);
      expect(section.status).toBe('chart_data');
      expect(section.prediction).toBeUndefined();
    }
  });

  it('marks AI-backed sections ai_pending before generation, ai_generated with cached text after', async () => {
    const before = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .expect(200);
    const healthBefore = before.body.sections.find((s: { slug: string }) => s.slug === 'health');
    expect(healthBefore.status).toBe('ai_pending');
    expect(healthBefore.predictionSection).toBe('health');
    expect(healthBefore.prediction).toBeNull();

    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'health', language: 'TA' })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .expect(200);
    const healthAfter = after.body.sections.find((s: { slug: string }) => s.slug === 'health');
    expect(healthAfter.status).toBe('ai_generated');
    expect(healthAfter.prediction.text).toBe('FAKE REPORT TEXT');
  });

  it('marks sections with no engine or prompt behind them yet as unavailable', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .expect(200);
    for (const slug of ['business', 'family', 'children', 'remedies', 'final_summary', 'graha_phalan']) {
      const section = res.body.sections.find((s: { slug: string }) => s.slug === slug);
      expect(section.status).toBe('unavailable');
    }
  });

  it('respects the language query param', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .query({ language: 'en' })
      .expect(200);
    expect(res.body.language).toBe('EN');
    expect(res.body.sections[0].title.en).toBe('Chart Summary');
  });

  it('400s for an invalid language', async () => {
    await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report`)
      .set(...authHeader(auth))
      .query({ language: 'not_a_real_language' })
      .expect(400);
  });

  it('404s for an unknown jathakam id', async () => {
    await request(app.getHttpServer())
      .get('/jathakams/00000000-0000-0000-0000-000000000000/report')
      .set(...authHeader(auth))
      .expect(404);
  });

  it("404s (not 403) when another user requests this jathakam's report", async () => {
    const otherUser = await registerTestUser(app, 'report-other');
    try {
      await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/report`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });
});
