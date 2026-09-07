import * as fs from 'fs';
import { BadRequestException, Controller, Get, Header, HttpCode, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../../auth/jathakam-ownership.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtPayload } from '../../auth/jwt-payload.type';

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

  // POST /jathakams/:id/report/pdf/email?language=TA — (re)generates the
  // PDF and emails it as an attachment to the logged-in user's own email
  // (the JWT's email claim — never a caller-supplied address, so this
  // can't be used to spam a third party's inbox).
  @HttpCode(200)
  @Post(':id/report/pdf/email')
  async email(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('language') language: string = 'TA',
  ) {
    await this.pdfService.emailToUser(id, validateLanguage(language), user.email);
    return { message: `Report emailed to ${user.email}` };
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
