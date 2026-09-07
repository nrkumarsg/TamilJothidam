import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_YOGA_RULES } from '../rules/yoga';
import { yogaDescription } from '../rules/yoga/yoga-names';
import { ALL_DOSHA_RULES } from '../rules/dosha';
import { doshaDescription } from '../rules/dosha/dosha-names';
import { CORE_TERMS, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../i18n/glossary';
import { PREDICTION_SECTIONS } from '../ai/prediction.types';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');

// Spec §35's "Manage yoga rules / dosha rules / prompts / languages / AI
// providers" are, today, all read-only listings — see
// backend/src/admin/README.md for exactly why "manage" doesn't mean
// "edit" yet for any of these (each is code or a file on disk, not a DB
// row a PATCH endpoint could sensibly change without a larger redesign).
@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listYogaRules() {
    return ALL_YOGA_RULES.map((rule) => ({
      name: rule.name,
      description: yogaDescription(rule.name),
    }));
  }

  listDoshaRules() {
    return ALL_DOSHA_RULES.map((rule) => ({
      name: rule.name,
      description: doshaDescription(rule.name),
    }));
  }

  listPrompts() {
    const languages: Array<'tamil' | 'english'> = ['tamil', 'english'];
    const entries: { language: string; section: string; path: string; updatedAt: Date }[] = [];

    const systemPath = path.join(PROMPTS_DIR, 'system.md');
    if (fs.existsSync(systemPath)) {
      entries.push({
        language: 'shared',
        section: 'system',
        path: 'prompts/system.md',
        updatedAt: fs.statSync(systemPath).mtime,
      });
    }

    for (const language of languages) {
      for (const section of PREDICTION_SECTIONS) {
        const filePath = path.join(PROMPTS_DIR, language, `${section}.md`);
        if (fs.existsSync(filePath)) {
          entries.push({
            language,
            section,
            path: `prompts/${language}/${section}.md`,
            updatedAt: fs.statSync(filePath).mtime,
          });
        }
      }
    }
    return entries;
  }

  listLanguages() {
    return {
      defaultLocale: DEFAULT_LOCALE,
      activelyTranslated: SUPPORTED_LOCALES,
      recognizedByCoreTermsCount: Object.keys(CORE_TERMS).length,
    };
  }

  async listAiProviders() {
    const configuredKeys = await this.prisma.apiKeyConfig.findMany({ select: { provider: true } });
    const configuredSet = new Set(configuredKeys.map((k) => k.provider));
    const activeProvider = (process.env.AI_DEFAULT_PROVIDER ?? 'anthropic').toUpperCase();

    return [
      { id: 'ANTHROPIC', implemented: true },
      { id: 'DEEPSEEK', implemented: true },
      { id: 'OLLAMA', implemented: true },
      { id: 'OPENAI', implemented: false },
      { id: 'GEMINI', implemented: false },
      { id: 'NVIDIA_NIM', implemented: false },
    ].map((p) => ({
      ...p,
      active: p.id === activeProvider,
      apiKeyConfigured: configuredSet.has(p.id as never),
    }));
  }

  // spec §35 "Manage remedies" — the Remedy table is per-jathakam generated
  // content (spec §28 section 32, "remedies"), not a global catalog admins
  // curate. Nothing writes to it yet: the report generator (Phase 15)
  // marks that section `unavailable`. This lists whatever exists today
  // (currently nothing, until a future phase builds remedy generation).
  listRemedies() {
    return this.prisma.remedy.findMany({ orderBy: { id: 'desc' }, take: 200 });
  }
}
