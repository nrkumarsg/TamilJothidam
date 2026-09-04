import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiProviderRegistry } from '../src/ai/providers/ai-provider.registry';
import { AIProvider } from '../src/ai/providers/ai-provider.interface';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

// A fake AIProvider that never touches the network — this suite verifies
// the interpretation pipeline (context assembly, caching, upsert,
// endpoints), not the real Anthropic API call, which anthropic.provider.spec
// already covers for the missing-key path.
class FakeProvider implements AIProvider {
  readonly id = 'ANTHROPIC' as const;
  callCount = 0;
  lastUserPrompt = '';

  async generate({ userPrompt }: { systemPrompt: string; userPrompt: string }) {
    this.callCount += 1;
    this.lastUserPrompt = userPrompt;
    return { text: `FAKE RESPONSE #${this.callCount}`, model: 'fake-model' };
  }
}

describe('Predictions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jathakamId: string;
  let profileId: string;
  let fakeProvider: FakeProvider;
  let auth: TestAuth;

  const profilePayload = {
    name: 'Predictions E2E Profile',
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
    fakeProvider = new FakeProvider();
    const fakeRegistry = { getProvider: () => fakeProvider } as unknown as AiProviderRegistry;

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
    auth = await registerTestUser(app, 'predictions');

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

  it('generates a prediction via the fake provider, tagging it HIGH confidence for an EXACT birth time', async () => {
    const res = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'basic_reading', language: 'TA' })
      .expect(201);

    expect(res.body.text).toBe('FAKE RESPONSE #1');
    expect(res.body.confidence).toBe('HIGH');
    expect(res.body.aiProvider).toBe('ANTHROPIC');
    expect(res.body.aiModel).toBe('fake-model');
    expect(fakeProvider.callCount).toBe(1);

    // The user prompt sent to the provider must carry the real calculated
    // chart data, not something the model was asked to invent.
    expect(fakeProvider.lastUserPrompt).toContain('"lagna"');
    expect(fakeProvider.lastUserPrompt).toContain('"currentDasha"');
  });

  it('returns the cached prediction on a second call instead of invoking the provider again', async () => {
    const res = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'basic_reading', language: 'TA' })
      .expect(201);

    expect(res.body.text).toBe('FAKE RESPONSE #1');
    expect(fakeProvider.callCount).toBe(1);
  });

  it('regenerate=true forces a fresh provider call and overwrites the cached row', async () => {
    const res = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'basic_reading', language: 'TA', regenerate: true })
      .expect(201);

    expect(res.body.text).toBe('FAKE RESPONSE #2');
    expect(fakeProvider.callCount).toBe(2);
  });

  it('lists all generated predictions for the jathakam', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'health', language: 'TA' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .expect(200);
    const sections = res.body.map((p: { section: string }) => p.section);
    expect(sections).toEqual(expect.arrayContaining(['basic_reading', 'health']));
  });

  it('a non-CURRENT palanPeriod always regenerates and sends a dashaTimeline in the prompt', async () => {
    const before = fakeProvider.callCount;

    const res1 = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'WHOLE_LIFE' } })
      .expect(201);
    expect(fakeProvider.callCount).toBe(before + 1);
    expect(fakeProvider.lastUserPrompt).toContain('"dashaTimeline"');
    expect(fakeProvider.lastUserPrompt).toContain('Whole life');

    // Calling again with the same non-CURRENT period regenerates again
    // (does not read the cache) — see interpretation.service.ts's
    // documented caching tradeoff for non-CURRENT palan periods.
    const res2 = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'WHOLE_LIFE' } })
      .expect(201);
    expect(fakeProvider.callCount).toBe(before + 2);
    expect(res2.body.text).not.toBe(res1.body.text);
  });

  it('palanPeriod NEXT_YEARS reflects the requested year count in the prompt instruction', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'NEXT_YEARS', years: 3 } })
      .expect(201);

    expect(fakeProvider.lastUserPrompt).toContain('Next 3 years');
  });

  it('palanPeriod UNTIL_DASHA names the target Mahadasha graha in the prompt instruction', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'UNTIL_DASHA', untilMahadashaGraha: 'SATURN' } })
      .expect(201);

    expect(fakeProvider.lastUserPrompt).toContain('Saturn Mahadasha');
  });

  it('a CURRENT palanPeriod behaves identically to omitting palanPeriod (cache is used)', async () => {
    // Prime the cache with a plain (no palanPeriod) call.
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'karma', language: 'TA' })
      .expect(201);
    const before = fakeProvider.callCount;

    const res = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'karma', language: 'TA', palanPeriod: { mode: 'CURRENT' } })
      .expect(201);

    expect(fakeProvider.callCount).toBe(before); // no new call — cache was used
    expect(res.body.text).toContain('FAKE RESPONSE');
  });

  it('400s for an invalid palanPeriod.mode', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'NOT_A_REAL_MODE' } })
      .expect(400);
  });

  it('400s for a NEXT_YEARS year count outside the 1-50 range', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'future', language: 'TA', palanPeriod: { mode: 'NEXT_YEARS', years: 0 } })
      .expect(400);
  });

  it('404s for an unknown jathakam id', async () => {
    await request(app.getHttpServer())
      .post('/jathakams/00000000-0000-0000-0000-000000000000/predictions')
      .set(...authHeader(auth))
      .send({ section: 'basic_reading', language: 'TA' })
      .expect(404);
  });

  it('400s for an unknown section', async () => {
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(auth))
      .send({ section: 'not_a_real_section', language: 'TA' })
      .expect(400);
  });

  it("404s (not 403) when another user requests this jathakam's predictions", async () => {
    const otherUser = await registerTestUser(app, 'predictions-other');
    try {
      await request(app.getHttpServer())
        .post(`/jathakams/${jathakamId}/predictions`)
        .set(...authHeader(otherUser))
        .send({ section: 'basic_reading', language: 'TA' })
        .expect(404);

      await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/predictions`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });
});
