import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.type';

// Attaches `request.user` from a verified `Authorization: Bearer <token>`
// header. Apply to any controller/route that must not be reachable
// anonymously — every jathakam-scoped controller (spec §41: never expose
// one user's birth data to another) uses this alongside
// JathakamOwnershipGuard.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    // Direct download links (e.g. the PDF endpoint, opened via
    // window.open()) can't attach a custom header, so a `token` query
    // param is accepted as a fallback there — a documented tradeoff (a
    // token in the URL can end up in logs/history) acceptable for this
    // project's current security bar; the header is always tried first.
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : (request.query.token as string | undefined);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization: Bearer <token> header (or ?token= query param)');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      (request as Request & { user: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
