import { Injectable, NotFoundException } from '@nestjs/common';
import { AiQuestion, Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JathakamService } from '../jathakam/jathakam.service';
import { DashaService } from '../dasha/dasha.service';
import { PromptLoaderService, PromptLanguage } from './prompt-loader.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { confidenceFromTimeAccuracy } from './prediction.types';
import { buildDashaTimeline } from './palan-period.types';
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

// Free-text "ask the chart a question" (e.g. "when can I go abroad?",
// "will my spouse work?") — the counterpart to InterpretationService's
// fixed 34-section reports, for questions that don't fit any of them.
// Same authority hierarchy as InterpretationService: the model only ever
// interprets the already-computed chart JSON, never calculates its own
// astronomy or invents a date outside the supplied dasha timeline.
@Injectable()
export class AskQuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jathakamService: JathakamService,
    private readonly dashaService: DashaService,
    private readonly promptLoader: PromptLoaderService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageLog: UsageLogService,
  ) {}

  async ask(jathakamId: string, question: string, language: Language): Promise<AiQuestion> {
    const jathakam = await this.jathakamService.findOne(jathakamId);
    const profile = await this.prisma.birthProfile.findUnique({ where: { id: jathakam.profileId } });
    if (!profile) throw new NotFoundException(`Birth profile for jathakam ${jathakamId} not found`);

    const asOf = new Date();
    const dasha = await this.dashaService.getSummary(jathakamId, asOf);
    const promptLanguage = PROMPT_LANGUAGE[language];

    // Always the full life timeline here — unlike the fixed-section reports,
    // a free-text question has no period selector, so the model needs the
    // whole dasha tree available to find whichever window actually answers
    // a "when" question rather than being limited to the current period.
    const dashaTimeline = buildDashaTimeline(dasha.mahadashaList, { mode: 'WHOLE_LIFE' }, asOf);

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
      dashaTimeline,
    };

    const systemPrompt = this.promptLoader
      .loadSystemPrompt()
      .replace(/\{\{language_name\}\}/g, LANGUAGE_NAME[promptLanguage]);
    const questionPrompt = this.promptLoader
      .loadSectionPrompt(promptLanguage, 'ask_question')
      .replace(/\{\{question\}\}/g, question);
    const userPrompt = `${questionPrompt}\n\n---\n\nCALCULATED CHART DATA (JSON — the only source of truth; do not alter or add to these facts):\n\`\`\`json\n${JSON.stringify(
      context,
      null,
      2,
    )}\n\`\`\``;

    const provider = this.providerRegistry.getProvider();
    let result;
    try {
      result = await provider.generate({ systemPrompt, userPrompt });
    } catch (err) {
      await this.usageLog.log('ERROR', {
        jathakamId,
        aiProvider: provider.id,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const servedBy = result.providerId ?? provider.id;

    await this.usageLog.log('QUESTION_ANSWERED', {
      jathakamId,
      aiProvider: servedBy,
      aiModel: result.model,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    const promptVersion = process.env.ASTROLOGY_PROMPT_VERSION ?? '1.0';
    const confidence = confidenceFromTimeAccuracy(profile.timeAccuracy);

    return this.prisma.aiQuestion.create({
      data: {
        jathakamId,
        language,
        question,
        answer: result.text,
        confidence,
        aiProvider: servedBy,
        aiModel: result.model,
        promptVersion,
      },
    });
  }

  async listForJathakam(jathakamId: string): Promise<AiQuestion[]> {
    return this.prisma.aiQuestion.findMany({ where: { jathakamId }, orderBy: { createdAt: 'desc' } });
  }
}
