import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashaService } from './dasha.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';

@UseGuards(JwtAuthGuard, JathakamOwnershipGuard)
@Controller('jathakams')
export class DashaController {
  constructor(private readonly dashaService: DashaService) {}

  // GET /jathakams/:id/dasha?asOf=2030-01-01 — spec §8: past/current/next
  // dasha at all three levels, plus the full Maha+Antar life timeline.
  @Get(':id/dasha')
  async getDasha(@Param('id') id: string, @Query('asOf') asOf?: string) {
    let asOfDate = new Date();
    if (asOf) {
      asOfDate = new Date(asOf);
      if (Number.isNaN(asOfDate.getTime())) {
        throw new BadRequestException(`Invalid "asOf" date: ${asOf}`);
      }
    }
    return this.dashaService.getSummary(id, asOfDate);
  }
}
