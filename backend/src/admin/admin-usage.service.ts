import { Injectable } from '@nestjs/common';
import { UsageEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageQuery {
  eventType?: UsageEventType;
  limit?: number;
}

// Spec §35 "View calculation logs / AI usage / token usage / errors" — one
// unified, queryable log (see logging/usage-log.service.ts for what
// writes to it) instead of four separate bespoke features.
@Injectable()
export class AdminUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UsageQuery) {
    return this.prisma.usageLog.findMany({
      where: query.eventType ? { eventType: query.eventType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 100, 500),
    });
  }

  // Summary numbers for the admin dashboard — total AI calls, total tokens
  // spent, error count, all time (spec §35 "View AI usage" / "View token
  // usage" read naturally as aggregates, not just a raw log feed).
  async summary() {
    const [predictionAgg, pdfCount, jathakamCount, errorCount] = await Promise.all([
      this.prisma.usageLog.aggregate({
        where: { eventType: 'PREDICTION_GENERATED' },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      this.prisma.usageLog.count({ where: { eventType: 'PDF_GENERATED' } }),
      this.prisma.usageLog.count({ where: { eventType: 'JATHAKAM_CREATED' } }),
      this.prisma.usageLog.count({ where: { eventType: 'ERROR' } }),
    ]);

    return {
      predictionsGenerated: predictionAgg._count._all,
      totalInputTokens: predictionAgg._sum.inputTokens ?? 0,
      totalOutputTokens: predictionAgg._sum.outputTokens ?? 0,
      pdfsGenerated: pdfCount,
      jathakamsCreated: jathakamCount,
      errors: errorCount,
    };
  }
}
