import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Language } from '@prisma/client';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';

const VALID_LANGUAGES = Object.values(Language);

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // GET /jathakams/:id/report?language=TA — the assembled 34-section table
  // of contents (spec §28). See report.service.ts for what each section's
  // `status` means.
  @Get(':id/report')
  async getReport(@Param('id') id: string, @Query('language') language: string = 'TA') {
    const upper = language.toUpperCase();
    if (!VALID_LANGUAGES.includes(upper as Language)) {
      throw new BadRequestException(`Invalid "language": ${language}`);
    }
    return this.reportService.assemble(id, upper as Language);
  }
}
