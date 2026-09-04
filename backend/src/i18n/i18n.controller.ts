import { Controller, Get } from '@nestjs/common';
import {
  CORE_TERMS,
  DEFAULT_LOCALE,
  GRAHA_NAMES,
  REPORT_SECTIONS,
  SUPPORTED_LOCALES,
} from './glossary';

// Exposes the hand-maintained glossary (spec §26 core terms, §28's 34
// report section headings, full graha names) so it has one real, testable
// consumer today, the same way Phase 4 added POST /calculation/preview to
// expose that engine ahead of its eventual caller. Phase 15 (full report
// generator) is the intended primary consumer, but as a backend module it
// can just import glossary.ts directly — this endpoint is for the frontend
// and for manual verification.
@Controller('i18n')
export class I18nController {
  @Get('glossary')
  getGlossary() {
    return {
      defaultLocale: DEFAULT_LOCALE,
      supportedLocales: SUPPORTED_LOCALES,
      grahaNames: GRAHA_NAMES,
      coreTerms: CORE_TERMS,
      reportSections: REPORT_SECTIONS,
    };
  }
}
