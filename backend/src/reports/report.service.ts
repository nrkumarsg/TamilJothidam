import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { REPORT_SECTIONS } from '../i18n/glossary';
import { JathakamService } from '../jathakam/jathakam.service';
import { InterpretationService } from '../ai/interpretation.service';
import { AI_SECTION_BY_SLUG, CHART_DATA_SLUGS, FullReport, ReportSectionEntry } from './report.types';

// Full report generator (Phase 15, spec §28's 34-section structure). This
// assembles a table of contents over what already exists — it does not
// recompute chart data (that stays owned by jathakam/dasha/transits) and
// does not generate AI text itself (that stays owned by
// InterpretationService); it only classifies each of the 34 sections by
// what's available today and attaches any already-cached AI prediction.
// All 34 sections now resolve to either 'chart_data' or an AI prediction
// section — 11 chart-data slugs (CHART_DATA_SLUGS) plus 23 AI-generated
// ones (AI_SECTION_BY_SLUG). 'unavailable' is kept as a status for
// forward-compatibility (a slug added to REPORT_SECTIONS without a
// matching entry in either map degrades to it, rather than crashing), but
// nothing currently produces it.
@Injectable()
export class ReportService {
  constructor(
    private readonly jathakamService: JathakamService,
    private readonly interpretationService: InterpretationService,
  ) {}

  async assemble(jathakamId: string, language: Language): Promise<FullReport> {
    await this.jathakamService.findOne(jathakamId); // 404s if unknown, same as every other jathakam-scoped endpoint

    const predictions = await this.interpretationService.listForJathakam(jathakamId);
    const predictionBySection = new Map(
      predictions.filter((p) => p.language === language).map((p) => [p.section, p]),
    );

    const sections: ReportSectionEntry[] = REPORT_SECTIONS.map((section) => {
      const title = { ta: section.ta, en: section.en };

      if (CHART_DATA_SLUGS.has(section.slug)) {
        return { id: section.id, slug: section.slug, title, status: 'chart_data' };
      }

      const predictionSection = AI_SECTION_BY_SLUG[section.slug];
      if (predictionSection) {
        const prediction = predictionBySection.get(predictionSection) ?? null;
        return {
          id: section.id,
          slug: section.slug,
          title,
          status: prediction ? 'ai_generated' : 'ai_pending',
          predictionSection,
          prediction,
        };
      }

      return { id: section.id, slug: section.slug, title, status: 'unavailable' };
    });

    return { jathakamId, language, generatedAt: new Date().toISOString(), sections };
  }
}
