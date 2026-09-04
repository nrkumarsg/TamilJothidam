import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { authHeader, registerTestUser, TestAuth } from './helpers/auth';

describe('Profiles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: TestAuth;

  const validPayload = {
    name: 'E2E Test Profile',
    gender: 'FEMALE',
    dateOfBirth: '1995-06-20',
    timeOfBirth: '14:45',
    timeAccuracy: 'WITHIN_5_MIN',
    location: {
      placeName: 'Madurai, Tamil Nadu, India',
      country: 'India',
      latitude: 9.9252,
      longitude: 78.1198,
      timezone: 'Asia/Kolkata',
      utcOffsetMinutes: 330,
      dstApplicable: false,
      manuallyCorrected: false,
    },
  };

  const createdProfileIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    auth = await registerTestUser(app, 'profiles');
  });

  afterAll(async () => {
    await prisma.birthProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({ where: { id: auth.userId } });
    await app.close();
  });

  it('401s without an Authorization header', async () => {
    await request(app.getHttpServer()).post('/profiles').send(validPayload).expect(401);
    await request(app.getHttpServer()).get('/profiles').expect(401);
  });

  it('rejects a payload missing required fields', async () => {
    await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(auth))
      .send({ name: 'Incomplete' })
      .expect(400);
  });

  it('creates a birth profile with its location and reads it back', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(auth))
      .send(validPayload)
      .expect(201);
    createdProfileIds.push(createRes.body.id);

    expect(createRes.body.name).toBe(validPayload.name);
    expect(createRes.body.birthLocation.placeName).toBe(validPayload.location.placeName);

    const getRes = await request(app.getHttpServer())
      .get(`/profiles/${createRes.body.id}`)
      .set(...authHeader(auth))
      .expect(200);

    expect(getRes.body.birthLocation.timezone).toBe('Asia/Kolkata');

    const listRes = await request(app.getHttpServer())
      .get('/profiles')
      .set(...authHeader(auth))
      .expect(200);
    expect(listRes.body.some((p: { id: string }) => p.id === createRes.body.id)).toBe(true);
  });

  it('404s for an unknown profile id', async () => {
    await request(app.getHttpServer())
      .get('/profiles/00000000-0000-0000-0000-000000000000')
      .set(...authHeader(auth))
      .expect(404);
  });

  it("404s (not 403) for another user's profile — never confirms it exists", async () => {
    const otherUser = await registerTestUser(app, 'profiles-other');
    try {
      const createRes = await request(app.getHttpServer())
        .post('/profiles')
        .set(...authHeader(auth))
        .send(validPayload)
        .expect(201);
      createdProfileIds.push(createRes.body.id);

      await request(app.getHttpServer())
        .get(`/profiles/${createRes.body.id}`)
        .set(...authHeader(otherUser))
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/profiles/${createRes.body.id}`)
        .set(...authHeader(otherUser))
        .expect(404);
    } finally {
      await prisma.user.deleteMany({ where: { id: otherUser.userId } });
    }
  });

  it('deletes a profile the user owns', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/profiles')
      .set(...authHeader(auth))
      .send(validPayload)
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/profiles/${createRes.body.id}`)
      .set(...authHeader(auth))
      .expect(204);

    await request(app.getHttpServer())
      .get(`/profiles/${createRes.body.id}`)
      .set(...authHeader(auth))
      .expect(404);
  });
});
