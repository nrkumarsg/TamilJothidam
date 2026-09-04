import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TransitsService } from './transits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class TransitsController {
  constructor(private readonly transitsService: TransitsService) {}

  // GET /jathakams/:id/transits?asOf=2026-09-03 — spec §9: Saturn/Jupiter/
  // Rahu/Ketu/Mars transit vs. the natal Moon and Lagna, clearly tagged as
  // transit output (never merged with natal-chart data).
  @Get(':id/transits')
  async getTransits(@Param('id') id: string, @Query('asOf') asOf?: string) {
    let asOfDate = new Date();
    if (asOf) {
      asOfDate = new Date(asOf);
      if (Number.isNaN(asOfDate.getTime())) {
        throw new BadRequestException(`Invalid "asOf" date: ${asOf}`);
      }
    }
    return this.transitsService.getTransits(id, asOfDate);
  }
}
