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
// 16 of the 34 sections have no engine or prompt behind them yet (business,
// family, children, education, foreign_travel, property, the four
// favorable_* sections, remedies, life_timeline, past_life, present_life,
// graha_phalan, final_summary) — reported honestly as 'unavailable' rather
// than silently omitted, so the frontend can show a real table of contents
// for the eventual full 34-section report.
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
