import * as fs from 'fs';
import { BadRequestException, Controller, Get, Header, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../../auth/jathakam-ownership.guard';

const VALID_LANGUAGES = Object.values(Language);

function validateLanguage(raw: string): Language {
  const upper = raw.toUpperCase();
  if (!VALID_LANGUAGES.includes(upper as Language)) {
    throw new BadRequestException(`Invalid "language": ${raw}`);
  }
  return upper as Language;
}

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  // POST /jathakams/:id/report/pdf?language=TA — (re)generates the PDF,
  // overwriting any previous one for this (jathakam, language).
  @Post(':id/report/pdf')
  async generate(@Param('id') id: string, @Query('language') language: string = 'TA') {
    const report = await this.pdfService.generate(id, validateLanguage(language));
    return {
      id: report.id,
      jathakamId: report.jathakamId,
      language: report.language,
      generatedAt: report.generatedAt,
      downloadUrl: `/jathakams/${id}/report/pdf?language=${report.language}`,
    };
  }

  // GET /jathakams/:id/report/pdf?language=TA — downloads the most
  // recently generated PDF. 404s if POST hasn't been called yet.
  @Get(':id/report/pdf')
  @Header('Content-Type', 'application/pdf')
  async download(@Param('id') id: string, @Query('language') language: string = 'TA'): Promise<StreamableFile> {
    const lang = validateLanguage(language);
    const report = await this.pdfService.getExisting(id, lang);
    const stream = fs.createReadStream(report.pdfPath!);
    return new StreamableFile(stream, {
      disposition: `attachment; filename="jathakam-${id}-${lang}.pdf"`,
    });
  }
}
