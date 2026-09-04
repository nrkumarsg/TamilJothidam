import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminCatalogService } from './admin-catalog.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  @Get('rules/yogas')
  listYogaRules() {
    return this.catalogService.listYogaRules();
  }

  @Get('rules/doshas')
  listDoshaRules() {
    return this.catalogService.listDoshaRules();
  }

  @Get('prompts')
  listPrompts() {
    return this.catalogService.listPrompts();
  }

  @Get('languages')
  listLanguages() {
    return this.catalogService.listLanguages();
  }

  @Get('ai-providers')
  listAiProviders() {
    return this.catalogService.listAiProviders();
  }

  @Get('remedies')
  listRemedies() {
    return this.catalogService.listRemedies();
  }
}
