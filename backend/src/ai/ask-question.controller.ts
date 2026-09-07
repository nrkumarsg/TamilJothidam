import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AskQuestionService } from './ask-question.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class AskQuestionController {
  constructor(private readonly askQuestionService: AskQuestionService) {}

  // POST /jathakams/:id/ask {question, language} — always a fresh AI call
  // (unlike /predictions, there's no fixed section to cache against; every
  // question is its own row).
  @Post(':id/ask')
  ask(@Param('id') id: string, @Body() dto: AskQuestionDto) {
    return this.askQuestionService.ask(id, dto.question, dto.language);
  }

  @Get(':id/ask')
  list(@Param('id') id: string) {
    return this.askQuestionService.listForJathakam(id);
  }
}
