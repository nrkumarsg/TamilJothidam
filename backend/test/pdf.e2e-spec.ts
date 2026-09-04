import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

// Real end-to-end PDF generation — actually launches the local headless
// Chromium-based browser (see pdf-renderer.spec.ts, which confirms one is
// available on this dev machine) and writes a real file, rather than
// mocking the renderer. Slower than the rest of the suite, so this test
// gets its own generous timeout.
describe('PDF (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jathakamId: string;
  let profileId: string;
  let auth: TestAuth;

  const profilePayload = {
    name: 'PDF E2E Profile',
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
    auth = await registerTestUser(app, 'pdf');

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

  it('generates a real PDF file and returns its metadata', async () => {
    const res = await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/report/pdf`)
      .set(...authHeader(auth))
      .send()
      .expect(201);

    expect(res.body.jathakamId).toBe(jathakamId);
    expect(res.body.language).toBe('TA');
    expect(res.body.downloadUrl).toContain(`/jathakams/${jathakamId}/report/pdf`);

    const report = await prisma.report.findUnique({
      where: { jathakamId_language: { jathakamId, language: 'TA' } },
    });
    expect(report?.pdfPath).toBeTruthy();
  }, 30000);

  it('downloads a genuine PDF via the Authorization header (starts with %PDF, non-trivial size)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report/pdf`)
      .set(...authHeader(auth))
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    const body: Buffer = res.body;
    expect(body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    // A single-page-of-text PDF is a few KB; a full multi-section report
    // with an embedded font and an SVG chart should be well past that.
    expect(body.length).toBeGreaterThan(50_000);
  });

  it('also downloads via the ?token= query param — the fallback direct-download links use (no custom header possible from window.open)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report/pdf`)
      .query({ token: auth.accessToken })
      .expect(200);

    expect(res.body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('regenerating overwrites the same Report row rather than creating a new one', async () => {
    const before = await prisma.report.count({ where: { jathakamId, language: 'TA' } });
    await request(app.getHttpServer())
      .post(`/jathakams/${jathakamId}/report/pdf`)
      .set(...authHeader(auth))
      .send()
      .expect(201);
    const after = await prisma.report.count({ where: { jathakamId, language: 'TA' } });
    expect(after).toBe(before);
  }, 30000);

  it('404s when downloading a PDF for a language never generated', async () => {
    await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report/pdf`)
      .set(...authHeader(auth))
      .query({ language: 'EN' })
      .expect(404);
  });

  it('400s for an invalid language', async () => {
    await request(app.getHttpServer())
      .get(`/jathakams/${jathakamId}/report/pdf`)
      .set(...authHeader(auth))
      .query({ language: 'not_a_real_language' })
      .expect(400);
  });

  it('404s generating a PDF for an unknown jathakam id', async () => {
    await request(app.getHttpServer())
      .post('/jathakams/00000000-0000-0000-0000-000000000000/report/pdf')
      .set(...authHeader(auth))
      .send()
      .expect(404);
  }, 30000);

  it("404s (not 403) when another user tries to generate or download this jathakam's PDF", async () => {
    const otherUser = await registerTestUser(app, 'pdf-other');
    try {
      await request(app.getHttpServer())
        .post(`/jathakams/${jathakamId}/report/pdf`)
        .set(...authHeader(otherUser))
        .send()
        .expect(404);

      await request(app.getHttpServer())
        .get(`/jathakams/${jathakamId}/report/pdf`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  }, 30000);
});
