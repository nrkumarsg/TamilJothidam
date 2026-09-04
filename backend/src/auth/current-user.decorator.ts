import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt-payload.type';

// Reads the payload JwtAuthGuard already verified and attached — only
// valid on routes guarded by JwtAuthGuard.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
  return request.user;
});
