import { Controller, Get, Query } from '@nestjs/common';
import { PanchangamService } from './panchangam.service';
import { PanchangamQueryDto } from './dto/panchangam-query.dto';

// Deliberately UNAUTHENTICATED, unlike every jathakam route: a panchangam is
// a public property of a date and a place, involves no birth data, and is
// exactly the kind of thing a visitor should be able to look up before
// creating an account.
@Controller('panchangam')
export class PanchangamController {
  constructor(private readonly panchangamService: PanchangamService) {}

  // GET /panchangam?date=2026-09-05&latitude=13.0827&longitude=80.2707&timezone=Asia/Kolkata
  @Get()
  get(@Query() query: PanchangamQueryDto) {
    return this.panchangamService.compute(query);
  }
}
