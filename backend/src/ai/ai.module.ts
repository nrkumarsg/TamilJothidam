import { Module } from '@nestjs/common';
import { InterpretationController } from './interpretation.controller';
import { InterpretationService } from './interpretation.service';
import { AskQuestionController } from './ask-question.controller';
import { AskQuestionService } from './ask-question.service';
import { PromptLoaderService } from './prompt-loader.service';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { JathakamModule } from '../jathakam/jathakam.module';
import { DashaModule } from '../dasha/dasha.module';
import { AuthModule } from '../auth/auth.module';
import { LoggingModule } from '../logging/logging.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [JathakamModule, DashaModule, AuthModule, LoggingModule, AdminModule],
  controllers: [InterpretationController, AskQuestionController],
  providers: [
    InterpretationService,
    AskQuestionService,
    PromptLoaderService,
    AiProviderRegistry,
    AnthropicProvider,
    DeepSeekProvider,
    OllamaProvider,
  ],
  exports: [InterpretationService, AskQuestionService],
})
export class AiModule {}
