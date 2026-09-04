import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload.type';
import { assertJathakamOwnership } from './ownership.util';

// Applies to every controller whose routes use `:id` as a jathakamId
// (DashaController, TransitsController, InterpretationController,
// ReportController, PdfController — JathakamController itself is more
// mixed-shaped and checks ownership inline instead, see jathakam.controller.ts).
// Must run after JwtAuthGuard (needs request.user already attached).
@Injectable()
export class JathakamOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    await assertJathakamOwnership(this.prisma, request.params.id, request.user.sub);
    return true;
  }
}
