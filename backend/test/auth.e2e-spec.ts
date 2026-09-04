import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GoogleAuthService, GoogleProfile } from '../src/auth/google-auth.service';

// A fake GoogleAuthService — this suite verifies the callback/linking
// logic (auth.service.ts's loginWithGoogle), not a real network round trip
// to Google, which google-auth.service.spec.ts already covers with mocked
// fetch calls.
class FakeGoogleAuthService {
  nextProfile: GoogleProfile | null = null;
  shouldThrow = false;

  buildAuthUrl() {
    return 'https://accounts.google.com/o/oauth2/v2/auth?fake=1';
  }

  async exchangeCodeForProfile(): Promise<GoogleProfile> {
    if (this.shouldThrow || !this.nextProfile) {
      throw new Error('fake exchange failure');
    }
    return this.nextProfile;
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeGoogle: FakeGoogleAuthService;
  const createdUserIds: string[] = [];

  function uniqueEmail(label: string) {
    return `auth-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  }

  beforeAll(async () => {
    fakeGoogle = new FakeGoogleAuthService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleAuthService)
      .useValue(fakeGoogle)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await app.close();
  });

  it('registers a new account and returns an access token', async () => {
    const email = uniqueEmail('register');
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);

    createdUserIds.push(res.body.user.id);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('USER');
    expect(res.body.user.plan).toBe('FREE');
    // The password hash must never be echoed back.
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('dup');
    const first = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);
    createdUserIds.push(first.body.user.id);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'a-different-password' })
      .expect(409);
  });

  it('rejects an invalid email or too-short password with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'correct-horse-battery' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail('short'), password: 'short' })
      .expect(400);
  });

  it('logs in with correct credentials', async () => {
    const email = uniqueEmail('login');
    const password = 'correct-horse-battery';
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);
    createdUserIds.push(registerRes.body.user.id);

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    expect(loginRes.body.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.user.email).toBe(email);
  });

  it('401s on a wrong password and on an unknown email, with the identical message either way', async () => {
    const email = uniqueEmail('wrongpw');
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);
    createdUserIds.push(registerRes.body.user.id);

    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'totally-wrong' })
      .expect(401);

    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail('never-registered'), password: 'whatever' })
      .expect(401);

    // Never reveal whether the email exists — same message for both cases.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('GET /auth/me returns the authenticated user, 401s without a token', async () => {
    const email = uniqueEmail('me');
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);
    createdUserIds.push(registerRes.body.user.id);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.id).toBe(registerRes.body.user.id);

    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer not-a-real-token').expect(401);
  });

  it('DELETE /auth/me deletes the account and cascades to its birth profiles', async () => {
    const email = uniqueEmail('delete');
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery' })
      .expect(201);
    const token = registerRes.body.accessToken;
    const userId = registerRes.body.user.id;

    const profileRes = await request(app.getHttpServer())
      .post('/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Deletion Test Profile',
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
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    // spec §41 "User deletion" / "Report deletion": the account and
    // everything it owned (schema.prisma's onDelete: Cascade chain) is
    // gone from the database — checked directly, not just via the API.
    const userRow = await prisma.user.findUnique({ where: { id: userId } });
    expect(userRow).toBeNull();
    const profileRow = await prisma.birthProfile.findUnique({ where: { id: profileRes.body.id } });
    expect(profileRow).toBeNull();
  });

  describe('Google sign-in', () => {
    function tokenFromRedirect(location: string): string {
      const url = new URL(location);
      const token = url.searchParams.get('token');
      expect(token).toBeTruthy();
      return token as string;
    }

    it('GET /auth/google redirects to the Google consent screen', async () => {
      const res = await request(app.getHttpServer()).get('/auth/google').expect(302);
      expect(res.headers.location).toContain('accounts.google.com');
    });

    it('creates a brand new account on first Google sign-in and issues a working token', async () => {
      const email = uniqueEmail('google-new');
      fakeGoogle.nextProfile = { googleId: `google-${Date.now()}`, email, name: 'Google User' };

      const res = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'fake-code' })
        .expect(302);
      expect(res.headers.location).toContain('/auth/callback?token=');
      const token = tokenFromRedirect(res.headers.location);

      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(meRes.body.email).toBe(email);
      createdUserIds.push(meRes.body.id);
    });

    it('signs into the SAME account on a second sign-in with the same googleId (no duplicate)', async () => {
      const email = uniqueEmail('google-repeat');
      const googleId = `google-${Date.now()}-repeat`;
      fakeGoogle.nextProfile = { googleId, email };

      const first = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'fake-code' })
        .expect(302);
      const firstToken = tokenFromRedirect(first.headers.location);
      const firstMe = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${firstToken}`)
        .expect(200);
      createdUserIds.push(firstMe.body.id);

      // Same googleId, same email — a second "sign in" round trip.
      fakeGoogle.nextProfile = { googleId, email };
      const second = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'fake-code-2' })
        .expect(302);
      const secondToken = tokenFromRedirect(second.headers.location);
      const secondMe = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(200);

      expect(secondMe.body.id).toBe(firstMe.body.id);
      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('links Google sign-in to an existing local (email/password) account sharing the same email', async () => {
      const email = uniqueEmail('google-link');
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct-horse-battery' })
        .expect(201);
      createdUserIds.push(registerRes.body.user.id);

      fakeGoogle.nextProfile = { googleId: `google-${Date.now()}-link`, email };
      const callbackRes = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'fake-code' })
        .expect(302);
      const googleToken = tokenFromRedirect(callbackRes.headers.location);
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${googleToken}`)
        .expect(200);

      // Same account as the original registration — not a second row.
      expect(meRes.body.id).toBe(registerRes.body.user.id);

      // The now-linked account can still log in with its original password.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'correct-horse-battery' })
        .expect(200);
    });

    it('redirects to /login with an error when Google reports an error or omits the code', async () => {
      const withError = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ error: 'access_denied' })
        .expect(302);
      expect(withError.headers.location).toContain('/login?error=google_oauth_failed');

      const withoutCode = await request(app.getHttpServer()).get('/auth/google/callback').expect(302);
      expect(withoutCode.headers.location).toContain('/login?error=google_oauth_failed');
    });

    it('redirects to /login with an error when the code exchange itself fails', async () => {
      fakeGoogle.shouldThrow = true;
      const res = await request(app.getHttpServer())
        .get('/auth/google/callback')
        .query({ code: 'will-fail' })
        .expect(302);
      expect(res.headers.location).toContain('/login?error=google_oauth_failed');
      fakeGoogle.shouldThrow = false;
    });
  });
});
