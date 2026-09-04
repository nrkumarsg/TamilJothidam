import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PdfController } from './pdf/pdf.controller';
import { PdfService } from './pdf/pdf.service';
import { JathakamModule } from '../jathakam/jathakam.module';
import { AiModule } from '../ai/ai.module';
import { DashaModule } from '../dasha/dasha.module';
import { TransitsModule } from '../transits/transits.module';
import { AuthModule } from '../auth/auth.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [JathakamModule, AiModule, DashaModule, TransitsModule, AuthModule, LoggingModule],
  controllers: [ReportController, PdfController],
  providers: [ReportService, PdfService],
})
export class ReportModule {}
