import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsageEventType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminUsageService } from './admin-usage.service';

const VALID_EVENT_TYPES = Object.values(UsageEventType);

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/usage')
export class AdminUsageController {
  constructor(private readonly adminUsageService: AdminUsageService) {}

  @Get()
  list(@Query('eventType') eventType?: string, @Query('limit') limit?: string) {
    let parsedType: UsageEventType | undefined;
    if (eventType) {
      const upper = eventType.toUpperCase();
      if (!VALID_EVENT_TYPES.includes(upper as UsageEventType)) {
        throw new BadRequestException(`Invalid "eventType": ${eventType}`);
      }
      parsedType = upper as UsageEventType;
    }
    return this.adminUsageService.list({ eventType: parsedType, limit: limit ? Number(limit) : undefined });
  }

  @Get('summary')
  summary() {
    return this.adminUsageService.summary();
  }
}
