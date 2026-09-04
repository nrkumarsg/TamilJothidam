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
    return { text: 'FAKE ADMIN TEST TEXT', model: 'fake-model', usage: { inputTokens: 111, outputTokens: 222 } };
  }
}

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestAuth;
  let regularUser: TestAuth;
  let jathakamId: string;
  let profileId: string;

  const profilePayload = {
    name: 'Admin E2E Profile',
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

    regularUser = await registerTestUser(app, 'admin-regular');
    admin = await registerTestUser(app, 'admin-actual');
    // The only way to become an admin: no self-service promotion endpoint
    // exists (see admin/README.md) — bootstrapped directly in the DB here,
    // same as a real deployment's first admin.
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });

    const profileRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(regularUser))
      .send(profilePayload)
      .expect(201);
    profileId = profileRes.body.id;
    const jathakamRes = await request(app.getHttpServer())
      .post('/jathakams')
      .set(...authHeader(regularUser))
      .send({ profileId })
      .expect(201);
    jathakamId = jathakamRes.body.id;

    // Generates a PREDICTION_GENERATED usage log with known token counts.
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/predictions`)
      .set(...authHeader(regularUser))
      .send({ section: 'basic_reading', language: 'TA' })
      .expect(201);

    // A Report row inserted directly — admin/reports listing shouldn't
    // depend on a real PDF/browser launch to be testable.
    await prisma.report.create({
      data: { jathakamId, language: 'TA', pdfPath: '/tmp/does-not-need-to-exist.pdf' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [admin.userId, regularUser.userId] } } });
    await app.close();
  });

  describe('access control', () => {
    it('401s every admin route without a token', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);
      await request(app.getHttpServer()).get('/admin/reports').expect(401);
      await request(app.getHttpServer()).get('/admin/usage').expect(401);
      await request(app.getHttpServer()).get('/admin/api-keys').expect(401);
    });

    it('403s every admin route for an authenticated non-admin user', async () => {
      await request(app.getHttpServer()).get('/admin/users').set(...authHeader(regularUser)).expect(403);
      await request(app.getHttpServer()).get('/admin/reports').set(...authHeader(regularUser)).expect(403);
      await request(app.getHttpServer()).get('/admin/usage').set(...authHeader(regularUser)).expect(403);
      await request(app.getHttpServer()).get('/admin/api-keys').set(...authHeader(regularUser)).expect(403);
      await request(app.getHttpServer()).get('/admin/rules/yogas').set(...authHeader(regularUser)).expect(403);
    });
  });

  describe('manage users', () => {
    it('lists users without ever including passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set(...authHeader(admin))
        .expect(200);
      expect(res.body.some((u: { id: string }) => u.id === regularUser.userId)).toBe(true);
      for (const u of res.body) {
        expect(u.passwordHash).toBeUndefined();
      }
    });

    it('reads, updates the role/plan, then deletes a user', async () => {
      const target = await registerTestUser(app, 'admin-target');

      const getRes = await request(app.getHttpServer())
        .get(`/admin/users/${target.userId}`)
        .set(...authHeader(admin))
        .expect(200);
      expect(getRes.body.email).toBe(target.email);
      expect(getRes.body.role).toBe('USER');

      const patchRes = await request(app.getHttpServer())
        .patch(`/admin/users/${target.userId}`)
        .set(...authHeader(admin))
        .send({ role: 'ASTROLOGER', plan: 'PREMIUM' })
        .expect(200);
      expect(patchRes.body.role).toBe('ASTROLOGER');
      expect(patchRes.body.plan).toBe('PREMIUM');

      await request(app.getHttpServer())
        .delete(`/admin/users/${target.userId}`)
        .set(...authHeader(admin))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/admin/users/${target.userId}`)
        .set(...authHeader(admin))
        .expect(404);
    });

    it('404s for an unknown user id', async () => {
      await request(app.getHttpServer())
        .get('/admin/users/00000000-0000-0000-0000-000000000000')
        .set(...authHeader(admin))
        .expect(404);
    });
  });

  describe('view generated reports', () => {
    it('lists reports across all users, with jathakam/profile context', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/reports')
        .set(...authHeader(admin))
        .expect(200);
      const found = res.body.find((r: { jathakamId: string }) => r.jathakamId === jathakamId);
      expect(found).toBeTruthy();
      expect(found.jathakam.profile.name).toBe(profilePayload.name);
    });
  });

  describe('usage / token usage / calculation logs / errors', () => {
    it('records a JATHAKAM_CREATED log with the creating user', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/usage')
        .query({ eventType: 'JATHAKAM_CREATED' })
        .set(...authHeader(admin))
        .expect(200);
      const found = res.body.find((l: { jathakamId: string }) => l.jathakamId === jathakamId);
      expect(found).toBeTruthy();
      expect(found.userId).toBe(regularUser.userId);
    });

    it('records a PREDICTION_GENERATED log with token usage from the provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/usage')
        .query({ eventType: 'PREDICTION_GENERATED' })
        .set(...authHeader(admin))
        .expect(200);
      const found = res.body.find((l: { jathakamId: string }) => l.jathakamId === jathakamId);
      expect(found).toBeTruthy();
      expect(found.aiProvider).toBe('ANTHROPIC');
      expect(found.inputTokens).toBe(111);
      expect(found.outputTokens).toBe(222);
    });

    it('summary aggregates total tokens and counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/usage/summary')
        .set(...authHeader(admin))
        .expect(200);
      expect(res.body.predictionsGenerated).toBeGreaterThanOrEqual(1);
      expect(res.body.totalInputTokens).toBeGreaterThanOrEqual(111);
      expect(res.body.totalOutputTokens).toBeGreaterThanOrEqual(222);
      expect(res.body.jathakamsCreated).toBeGreaterThanOrEqual(1);
    });

    it('400s for an invalid eventType filter', async () => {
      await request(app.getHttpServer())
        .get('/admin/usage')
        .query({ eventType: 'NOT_A_REAL_TYPE' })
        .set(...authHeader(admin))
        .expect(400);
    });
  });

  describe('manage API keys', () => {
    afterEach(async () => {
      await prisma.apiKeyConfig.deleteMany({ where: { provider: 'ANTHROPIC' } });
    });

    it('sets a key, lists it masked (never plaintext), then deletes it', async () => {
      const setRes = await request(app.getHttpServer())
        .post('/admin/api-keys')
        .set(...authHeader(admin))
        .send({ provider: 'ANTHROPIC', key: 'sk-ant-totally-real-secret-key-999' })
        .expect(201);
      expect(setRes.body.configured).toBe(true);
      expect(setRes.body.maskedKey).not.toContain('totally-real-secret');

      const listRes = await request(app.getHttpServer())
        .get('/admin/api-keys')
        .set(...authHeader(admin))
        .expect(200);
      const anthropicEntry = listRes.body.find((k: { provider: string }) => k.provider === 'ANTHROPIC');
      expect(anthropicEntry.configured).toBe(true);
      expect(JSON.stringify(listRes.body)).not.toContain('totally-real-secret');

      await request(app.getHttpServer())
        .delete('/admin/api-keys/ANTHROPIC')
        .set(...authHeader(admin))
        .expect(204);

      const afterDelete = await request(app.getHttpServer())
        .get('/admin/api-keys')
        .set(...authHeader(admin))
        .expect(200);
      expect(afterDelete.body.find((k: { provider: string }) => k.provider === 'ANTHROPIC').configured).toBe(false);
    });

    it('400s for an invalid provider', async () => {
      await request(app.getHttpServer())
        .post('/admin/api-keys')
        .set(...authHeader(admin))
        .send({ provider: 'NOT_A_REAL_PROVIDER', key: 'x' })
        .expect(400);
    });
  });

  describe('read-only catalog listings', () => {
    it('lists all 8 yoga rules and 4 dosha rules by name', async () => {
      const yogas = await request(app.getHttpServer())
        .get('/admin/rules/yogas')
        .set(...authHeader(admin))
        .expect(200);
      expect(yogas.body).toHaveLength(8);
      expect(yogas.body.map((y: { name: string }) => y.name)).toContain('Raja Yoga');

      const doshas = await request(app.getHttpServer())
        .get('/admin/rules/doshas')
        .set(...authHeader(admin))
        .expect(200);
      expect(doshas.body).toHaveLength(4);
    });

    it('lists prompt files including the shared system prompt', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/prompts')
        .set(...authHeader(admin))
        .expect(200);
      expect(res.body.some((p: { section: string }) => p.section === 'system')).toBe(true);
      expect(res.body.some((p: { language: string; section: string }) => p.language === 'tamil' && p.section === 'health')).toBe(true);
    });

    it('lists supported languages', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/languages')
        .set(...authHeader(admin))
        .expect(200);
      expect(res.body.defaultLocale).toBe('ta');
      expect(res.body.activelyTranslated).toEqual(['ta', 'en']);
    });

    it('lists AI providers with implemented/active flags', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/ai-providers')
        .set(...authHeader(admin))
        .expect(200);
      const anthropic = res.body.find((p: { id: string }) => p.id === 'ANTHROPIC');
      expect(anthropic.implemented).toBe(true);
      const openai = res.body.find((p: { id: string }) => p.id === 'OPENAI');
      expect(openai.implemented).toBe(false);
    });

    it('lists remedies (empty until a future phase generates any)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/remedies')
        .set(...authHeader(admin))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
