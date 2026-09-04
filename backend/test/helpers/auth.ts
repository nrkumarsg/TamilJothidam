import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TestAuth {
  accessToken: string;
  userId: string;
  email: string;
}

// Registers a fresh throwaway user for one test suite and returns its
// bearer token — every e2e suite touching an authenticated endpoint
// (everything except health/i18n, which need no auth, and database, which
// talks to Prisma directly) calls this once in beforeAll.
export async function registerTestUser(app: INestApplication, label: string): Promise<TestAuth> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  const password = 'test-password-123';

  const res = await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

  return { accessToken: res.body.accessToken, userId: res.body.user.id, email };
}

export function authHeader(auth: TestAuth): [string, string] {
  return ['Authorization', `Bearer ${auth.accessToken}`];
}
