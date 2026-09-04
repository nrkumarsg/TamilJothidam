import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt-payload.type';

function contextWithUser(user: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function fakePrisma(role: string | null): PrismaService {
  return {
    user: { findUnique: async () => (role === null ? null : { role }) },
  } as unknown as PrismaService;
}

// Deliberately checks the CURRENT role via a fresh DB lookup, not the
// role embedded in the JWT payload at sign-in time — see admin.guard.ts's
// comment for why (a stale claim would let a demoted admin keep access).
describe('AdminGuard', () => {
  it('allows a user whose current DB role is ADMIN', async () => {
    const guard = new AdminGuard(fakePrisma('ADMIN'));
    await expect(
      guard.canActivate(contextWithUser({ sub: 'u1', email: 'a@b.com', role: 'ADMIN' })),
    ).resolves.toBe(true);
  });

  it('throws ForbiddenException for a regular USER', async () => {
    const guard = new AdminGuard(fakePrisma('USER'));
    await expect(
      guard.canActivate(contextWithUser({ sub: 'u1', email: 'a@b.com', role: 'USER' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the JWT claims ADMIN but the current DB role no longer is (demoted)', async () => {
    const guard = new AdminGuard(fakePrisma('USER'));
    await expect(
      guard.canActivate(contextWithUser({ sub: 'u1', email: 'a@b.com', role: 'ADMIN' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user no longer exists', async () => {
    const guard = new AdminGuard(fakePrisma(null));
    await expect(
      guard.canActivate(contextWithUser({ sub: 'u1', email: 'a@b.com', role: 'ADMIN' })),
    ).rejects.toThrow(ForbiddenException);
  });
});
