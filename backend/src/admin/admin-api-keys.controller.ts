import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { AIProviderId } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminApiKeysService } from './admin-api-keys.service';
import { SetApiKeyDto } from './dto/set-api-key.dto';

const VALID_PROVIDERS = Object.values(AIProviderId);

function validateProvider(raw: string): AIProviderId {
  const upper = raw.toUpperCase();
  if (!VALID_PROVIDERS.includes(upper as AIProviderId)) {
    throw new BadRequestException(`Invalid "provider": ${raw}`);
  }
  return upper as AIProviderId;
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/api-keys')
export class AdminApiKeysController {
  constructor(private readonly adminApiKeysService: AdminApiKeysService) {}

  // Never returns a decrypted key — only whether one is configured and a
  // masked preview (crypto.util.ts's maskSecret).
  @Get()
  list() {
    return this.adminApiKeysService.list();
  }

  @Post()
  set(@Body() dto: SetApiKeyDto) {
    return this.adminApiKeysService.set(dto.provider, dto.key);
  }

  @Delete(':provider')
  @HttpCode(204)
  async delete(@Param('provider') provider: string): Promise<void> {
    await this.adminApiKeysService.delete(validateProvider(provider));
  }
}
