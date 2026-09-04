import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JathakamService } from './jathakam.service';
import { CreateJathakamDto } from './dto/create-jathakam.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JathakamOwnershipGuard } from '../auth/jathakam-ownership.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.type';
import { assertProfileOwnership } from '../auth/ownership.util';
import { UsageLogService } from '../logging/usage-log.service';

// Ownership checks are inline here rather than a class-level
// JathakamOwnershipGuard (unlike Dasha/Transits/Interpretation/Report/Pdf
// controllers) because this controller's three routes don't share one
// param shape: create/findForProfile key off a profileId (body or route
// param), only findOne keys off a jathakamId.
@UseGuards(JwtAuthGuard)
@Controller('jathakams')
export class JathakamController {
  constructor(
    private readonly jathakamService: JathakamService,
    private readonly prisma: PrismaService,
    private readonly usageLog: UsageLogService,
  ) {}

  @Post()
  async create(@Body() dto: CreateJathakamDto, @CurrentUser() user: JwtPayload) {
    await assertProfileOwnership(this.prisma, dto.profileId, user.sub);
    const jathakam = await this.jathakamService.create(dto.profileId);
    await this.usageLog.log('JATHAKAM_CREATED', { userId: user.sub, jathakamId: jathakam.id });
    return jathakam;
  }

  @UseGuards(JathakamOwnershipGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jathakamService.findOne(id);
  }

  @Get('profile/:profileId')
  async findForProfile(@Param('profileId') profileId: string, @CurrentUser() user: JwtPayload) {
    await assertProfileOwnership(this.prisma, profileId, user.sub);
    return this.jathakamService.findForProfile(profileId);
  }
}
