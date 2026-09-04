import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: is the process up? Deliberately touches nothing external, so
  // an orchestrator never restarts a healthy API just because Postgres is
  // briefly unreachable — that's what readiness is for.
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'tamil-jathakam-backend',
      timestamp: new Date().toISOString(),
    };
  }

  // Readiness: should this instance receive traffic? Every meaningful route
  // needs the database, so an instance that can't reach it isn't ready.
  // Returns 503 so a load balancer takes it out of rotation rather than
  // sending users errors.
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        dependency: 'database',
        message: err instanceof Error ? err.message : 'Database is unreachable',
      });
    }
    return {
      status: 'ready',
      service: 'tamil-jathakam-backend',
      dependencies: { database: 'ok' },
      timestamp: new Date().toISOString(),
    };
  }
}
