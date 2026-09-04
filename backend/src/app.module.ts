import { Module } from '@nestjs/common';
import { HealthModule } from './common/health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { LocationModule } from './locations/location.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CalculationModule } from './calculation/calculation.module';
import { JathakamModule } from './jathakam/jathakam.module';
import { DashaModule } from './dasha/dasha.module';
import { TransitsModule } from './transits/transits.module';
import { AiModule } from './ai/ai.module';
import { I18nModule } from './i18n/i18n.module';
import { ReportModule } from './reports/report.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { LoggingModule } from './logging/logging.module';

// Feature modules are added here phase by phase (see docs/ARCHITECTURE.md).
// Phase 1: health check. Phase 2: Prisma/DB layer. Phase 3: birth data
// intake. Phase 4: astronomical calculation engine. Phase 5: jathakam
// engine (persists calculation output, computes bhava lordships). Phase 9:
// Vimshottari Dasha. Phase 10: Transit/Gochara engine. Phase 13: AI
// interpretation engine. Phase 14: Tamil/English glossary + report section
// headings. Phase 15: full report generator (assembles all 34 sections).
// Phase 16: PDF generation. Phase 17: authentication + user profiles.
// Phase 18: admin panel.
@Module({
  imports: [
    PrismaModule,
    HealthModule,
    LocationModule,
    AuthModule,
    ProfilesModule,
    CalculationModule,
    JathakamModule,
    DashaModule,
    TransitsModule,
    LoggingModule,
    AdminModule,
    AiModule,
    I18nModule,
    ReportModule,
  ],
})
export class AppModule {}
