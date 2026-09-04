import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec §35 "View generated reports" — across all users, unlike
// GET /jathakams/:id/report/pdf which is scoped to the requesting user.
@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.report.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 200,
      include: {
        jathakam: {
          select: {
            id: true,
            profile: { select: { id: true, name: true, userId: true } },
          },
        },
      },
    });
  }
}
