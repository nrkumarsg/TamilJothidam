import { Injectable, Logger } from '@nestjs/common';
import { AIProviderId, UsageEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageLogEntry {
  userId?: string;
  jathakamId?: string;
  aiProvider?: AIProviderId;
  aiModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
}

// Backs the admin panel's "View calculation logs / AI usage / token usage /
// errors" (spec §35) as one unified, queryable log rather than four
// separate bespoke features. Called from InterpretationService, PdfService,
// and JathakamController at their success/failure points — see
// backend/src/admin/README.md for exactly where.
//
// Logging must never break the request it's observing: every write is
// swallowed on failure (logged to the console, not rethrown).
@Injectable()
export class UsageLogService {
  private readonly logger = new Logger(UsageLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(eventType: UsageEventType, entry: UsageLogEntry = {}): Promise<void> {
    try {
      await this.prisma.usageLog.create({ data: { eventType, ...entry } });
    } catch (err) {
      this.logger.error(`Failed to write usage log (${eventType})`, err instanceof Error ? err.stack : err);
    }
  }
}
