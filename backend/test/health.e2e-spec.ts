import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) returns ok status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('tamil-jathakam-backend');
      });
  });

  // Phase 20: liveness and readiness are deliberately separate — liveness
  // must not depend on Postgres, or an orchestrator would restart healthy
  // instances during a brief database blip.
  it('/health/ready (GET) reports ready when the database is reachable', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ready');
        expect(res.body.dependencies.database).toBe('ok');
      });
  });

  it('/health/ready (GET) returns 503 when the database is unreachable', async () => {
    // Simulates Postgres being down: readiness must fail so a load
    // balancer pulls this instance, while liveness stays green.
    const prisma = app.get(PrismaService);
    const spy = jest
      .spyOn(prisma, '$queryRaw')
      .mockRejectedValueOnce(new Error("Can't reach database server"));

    await request(app.getHttpServer()).get('/health/ready').expect(503);
    await request(app.getHttpServer()).get('/health').expect(200);

    spy.mockRestore();
  });
});
