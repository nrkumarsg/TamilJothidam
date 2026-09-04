import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt-payload.type';

// Must run after JwtAuthGuard (needs request.user already attached).
// Unlike JathakamOwnershipGuard, a 403 here is correct, not a privacy leak
// — admin routes are known infrastructure, not another user's private
// data, so there's nothing to hide by confirming they exist.
//
// Deliberately re-reads the role from the database on every request
// instead of trusting the JWT payload's `role` claim: a JWT's claims are
// fixed at sign-in time, so trusting it here would mean a freshly-promoted
// admin can't act until they log in again, and — the more serious half —
// a demoted admin keeps admin access for the rest of their token's
// lifetime (up to JWT_EXPIRES_IN, default 7d). One extra query per admin
// request is a reasonable cost for an authorization check this sensitive.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
