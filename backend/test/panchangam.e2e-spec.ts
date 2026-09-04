import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Panchangam (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // main.ts applies this globally at real boot; replicated here since
    // tests build the Nest app directly without going through bootstrap().
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/panchangam (GET) returns the panchangam WITHOUT any Authorization header', () => {
    // Deliberately unauthenticated, unlike every jathakam route: a
    // panchangam is a public property of a date and place, not of a user's
    // birth data.
    return request(app.getHttpServer())
      .get('/panchangam')
      .query({ date: '2026-09-05', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' })
      .expect(200)
      .expect((res) => {
        expect(res.body.vaara.name.en).toBe('Saturday');
        expect(res.body.tithi.index).toBeGreaterThanOrEqual(1);
        expect(res.body.sunrise).toBeTruthy();
        expect(res.body.rahuKalam.start).toBeTruthy();
      });
  });

  it('rejects a malformed date with 400', () => {
    return request(app.getHttpServer())
      .get('/panchangam')
      .query({ date: 'not-a-date', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' })
      .expect(400);
  });

  it('rejects an out-of-range latitude with 400', () => {
    return request(app.getHttpServer())
      .get('/panchangam')
      .query({ date: '2026-09-05', latitude: 200, longitude: 80.2707, timezone: 'Asia/Kolkata' })
      .expect(400);
  });

  it('rejects a missing timezone with 400', () => {
    return request(app.getHttpServer())
      .get('/panchangam')
      .query({ date: '2026-09-05', latitude: 13.0827, longitude: 80.2707 })
      .expect(400);
  });

  it('reports polar day/night for a high-latitude midsummer query instead of erroring', () => {
    return request(app.getHttpServer())
      .get('/panchangam')
      .query({ date: '2026-06-21', latitude: 78.22, longitude: 15.65, timezone: 'Arctic/Longyearbyen' })
      .expect(200)
      .expect((res) => {
        expect(res.body.polarDayOrNight).toBe(true);
        expect(res.body.sunrise).toBeNull();
        expect(res.body.rahuKalam).toBeNull();
      });
  });
});
