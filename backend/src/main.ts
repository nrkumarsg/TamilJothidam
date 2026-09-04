import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadConfig } from './config/configuration';
import {
  checkProductionReadiness,
  formatReadinessReport,
  resolveCorsOrigins,
} from './config/production-readiness';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const config = loadConfig();
  const isProduction = config.nodeEnv === 'production';

  // Phase 20: refuse to start a production deployment that is missing or
  // still using placeholder secrets, rather than failing later when a user
  // hits the feature. In development the same checks only warn.
  const problems = checkProductionReadiness(process.env, config.nodeEnv);
  if (problems.length > 0) {
    const report = formatReadinessReport(problems);
    if (problems.some((p) => p.severity === 'error')) {
      logger.error(`Refusing to start — configuration problems:\n${report}`);
      throw new Error('Invalid configuration; see the errors above.');
    }
    logger.warn(`Configuration warnings (these would block a production deploy):\n${report}`);
  }

  const app = await NestFactory.create(AppModule);

  // Never a silent allow-all in production — resolveCorsOrigins() only
  // reflects any origin in development, and production can't boot without
  // CORS_ORIGINS thanks to the check above.
  app.enableCors({ origin: resolveCorsOrigins(process.env, config.nodeEnv), credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Containers stop with SIGTERM; without this Nest never runs
  // onModuleDestroy and Prisma's connections are dropped rather than closed.
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(
    `Tamil Jathakam backend listening on port ${config.port} (${isProduction ? 'production' : config.nodeEnv})`,
  );
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
