import { Injectable, NotFoundException } from '@nestjs/common';
import { Language, Prediction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JathakamService } from '../jathakam/jathakam.service';
import { DashaService } from '../dasha/dasha.service';
import { PromptLoaderService, PromptLanguage } from './prompt-loader.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { PredictionSection, confidenceFromTimeAccuracy } from './prediction.types';
import { PalanPeriodOptions, buildDashaTimeline, describePalanPeriod } from './palan-period.types';
import { UsageLogService } from '../logging/usage-log.service';

const LANGUAGE_NAME: Record<PromptLanguage, string> = { ta: 'தமிழ் (Tamil)', en: 'English' };
const PROMPT_LANGUAGE: Record<Language, PromptLanguage> = {
  TA: 'ta',
  EN: 'en',
  SI: 'en',
  ML: 'en',
  HI: 'en',
  TE: 'en',
  KN: 'en',
  MS: 'en',
};

// AI Interpretation Engine (Phase 13, spec §25). The ONLY thing this
// service sends the model is the already-computed structured chart JSON
// (from CalculationService -> JathakamService -> DashaService, Phases
// 4-12) plus a prompt template — it never asks the model to calculate or
// invent astronomy, per the pipeline's authority hierarchy
// (docs/ARCHITECTURE.md § AI architecture).
@Injectable()
export class InterpretationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jathakamService: JathakamService,
    private readonly dashaService: DashaService,
    private readonly promptLoader: PromptLoaderService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageLog: UsageLogService,
  ) {}

  async generate(
    jathakamId: string,
    section: PredictionSection,
    language: Language,
    regenerate = false,
    palanPeriod?: PalanPeriodOptions,
  ): Promise<Prediction> {
    // A non-CURRENT palan period always regenerates: the user explicitly
    // asked for a specific look-ahead window, so returning a stale cached
    // answer (possibly generated for a different window, or none at all)
    // would be wrong. This intentionally does NOT keep separate cached
    // variants per period — the Prediction row for [jathakamId, section,
    // language] still has only one slot (spec'd in schema.prisma), so the
    // upsert below overwrites it with whichever variant was generated most
    // recently. A fuller implementation would extend that unique key with
    // a period dimension; deferred as schema complexity that a feature used
    // for occasional explicit look-ahead requests doesn't need yet.
    const hasCustomPeriod = palanPeriod !== undefined && palanPeriod.mode !== 'CURRENT';

    if (!regenerate && !hasCustomPeriod) {
      const existing = await this.prisma.prediction.findUnique({
        where: { jathakamId_section_language: { jathakamId, section, language } },
      });
      if (existing) return existing;
    }

    const jathakam = await this.jathakamService.findOne(jathakamId);
    const profile = await this.prisma.birthProfile.findUnique({ where: { id: jathakam.profileId } });
    if (!profile) throw new NotFoundException(`Birth profile for jathakam ${jathakamId} not found`);

    const asOf = new Date();
    const dasha = await this.dashaService.getSummary(jathakamId, asOf);
    const promptLanguage = PROMPT_LANGUAGE[language];

    const context: Record<string, unknown> = {
      profile: {
        name: profile.name,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
        timeOfBirth: profile.timeOfBirth,
        timeAccuracy: profile.timeAccuracy,
      },
      lagna: jathakam.lagna,
      rasi: jathakam.rasi,
      planets: jathakam.planets.filter((p) => p.graha !== 'LAGNA'),
      houses: jathakam.houseAnalysis,
      navamsa: jathakam.navamsa,
      yogas: jathakam.yogas,
      doshas: jathakam.doshas,
      currentDasha: {
        mahadasha: dasha.mahadasha.current,
        antardasha: dasha.antardasha.current,
        pratyantardasha: dasha.pratyantardasha.current,
      },
    };

    let periodInstruction = '';
    if (hasCustomPeriod && palanPeriod) {
      const periodLabel = describePalanPeriod(palanPeriod);
      context.requestedPeriod = periodLabel;
      context.dashaTimeline = buildDashaTimeline(dasha.mahadashaList, palanPeriod, asOf);
      periodInstruction =
        `\n\nThe user has specifically requested this prediction scoped to: "${periodLabel.en}". ` +
        'Reason using the "dashaTimeline" array in the data below (in addition to "currentDasha") to ' +
        'discuss this timeframe, naming the relevant dasha/antardasha periods and their approximate ' +
        'dates. Do not invent any period or date not present in dashaTimeline or currentDasha.';
    }

    const systemPrompt = this.promptLoader
      .loadSystemPrompt()
      .replace(/\{\{language_name\}\}/g, LANGUAGE_NAME[promptLanguage]);
    const sectionPrompt = this.promptLoader.loadSectionPrompt(promptLanguage, section);
    const userPrompt = `${sectionPrompt}${periodInstruction}\n\n---\n\nCALCULATED CHART DATA (JSON — the only source of truth; do not alter or add to these facts):\n\`\`\`json\n${JSON.stringify(
      context,
      null,
      2,
    )}\n\`\`\``;

    const provider = this.providerRegistry.getProvider();
    let result;
    try {
      result = await provider.generate({ systemPrompt, userPrompt });
    } catch (err) {
      // provider.id is the fallback chain's PRIMARY id here — every
      // provider in the chain already failed by the time this throws (see
      // FallbackAiProvider), so there is no "actual" provider to report.
      await this.usageLog.log('ERROR', {
        jathakamId,
        aiProvider: provider.id,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // result.providerId is set when a fallback chain served this via a
    // provider other than the primary — that's what actually ran, and what
    // Prediction.aiProvider / the usage log must reflect.
    const servedBy = result.providerId ?? provider.id;

    await this.usageLog.log('PREDICTION_GENERATED', {
      jathakamId,
      aiProvider: servedBy,
      aiModel: result.model,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    const promptVersion = process.env.ASTROLOGY_PROMPT_VERSION ?? '1.0';
    const confidence = confidenceFromTimeAccuracy(profile.timeAccuracy);

    return this.prisma.prediction.upsert({
      where: { jathakamId_section_language: { jathakamId, section, language } },
      create: {
        jathakamId,
        section,
        language,
        text: result.text,
        confidence,
        aiProvider: servedBy,
        aiModel: result.model,
        promptVersion,
      },
      update: {
        text: result.text,
        confidence,
        aiProvider: servedBy,
        aiModel: result.model,
        promptVersion,
      },
    });
  }

  async listForJathakam(jathakamId: string): Promise<Prediction[]> {
    return this.prisma.prediction.findMany({ where: { jathakamId }, orderBy: { section: 'asc' } });
  }
}
