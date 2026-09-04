import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Connection is intentionally lazy (Prisma connects on first query) rather
// than eagerly connecting in onModuleInit — this lets the API boot and serve
// non-DB routes (e.g. /health) even when Postgres isn't reachable yet.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
