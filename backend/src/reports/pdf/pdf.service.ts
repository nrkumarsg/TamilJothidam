import * as fs from 'fs';
import * as path from 'path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Language, Report } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JathakamService } from '../../jathakam/jathakam.service';
import { DashaService } from '../../dasha/dasha.service';
import { TransitsService } from '../../transits/transits.service';
import { ReportService } from '../report.service';
import { buildReportHtml } from './report-template';
import { renderHtmlToPdf } from './pdf-renderer';
import { UsageLogService } from '../../logging/usage-log.service';

// Regenerable from already-persisted DB data, not source — see .gitignore.
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'generated-reports');

// PDF generation (Phase 16, spec §40). Renders the same 34-section
// structure Phase 15's ReportService assembles, plus the actual chart/
// dasha/transit data (the report endpoint only carries pointers + cached
// AI text — the PDF needs real content) into HTML, then prints it via
// headless Chromium (see pdf-renderer.ts). One PDF per (jathakam,
// language); regenerating overwrites both the file and its Report row.
@Injectable()
export class PdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jathakamService: JathakamService,
    private readonly dashaService: DashaService,
    private readonly transitsService: TransitsService,
    private readonly reportService: ReportService,
    private readonly usageLog: UsageLogService,
  ) {}

  async generate(jathakamId: string, language: Language): Promise<Report> {
    try {
      const jathakam = await this.jathakamService.findOne(jathakamId);
      const profile = await this.prisma.birthProfile.findUnique({
        where: { id: jathakam.profileId },
        include: { birthLocation: true },
      });
      if (!profile) throw new NotFoundException(`Birth profile for jathakam ${jathakamId} not found`);

      const [dasha, transits, fullReport] = await Promise.all([
        this.dashaService.getSummary(jathakamId),
        this.transitsService.getTransits(jathakamId),
        this.reportService.assemble(jathakamId, language),
      ]);

      const html = buildReportHtml({ language, profile, jathakam, dasha, transits, fullReport });
      const pdfBuffer = await renderHtmlToPdf(html);

      if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      const filePath = path.join(OUTPUT_DIR, `${jathakamId}-${language}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);

      const report = await this.prisma.report.upsert({
        where: { jathakamId_language: { jathakamId, language } },
        create: { jathakamId, language, pdfPath: filePath },
        update: { pdfPath: filePath, generatedAt: new Date() },
      });
      await this.usageLog.log('PDF_GENERATED', { jathakamId });
      return report;
    } catch (err) {
      await this.usageLog.log('ERROR', {
        jathakamId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async getExisting(jathakamId: string, language: Language): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { jathakamId_language: { jathakamId, language } },
    });
    if (!report || !report.pdfPath || !fs.existsSync(report.pdfPath)) {
      throw new NotFoundException(
        `No PDF report generated yet for jathakam ${jathakamId} (${language}) — POST .../report/pdf first`,
      );
    }
    return report;
  }
}
