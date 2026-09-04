import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from './admin.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminUsageController } from './admin-usage.controller';
import { AdminUsageService } from './admin-usage.service';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { AdminApiKeysService } from './admin-api-keys.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminUsersController,
    AdminCatalogController,
    AdminReportsController,
    AdminUsageController,
    AdminApiKeysController,
  ],
  providers: [
    AdminGuard,
    AdminUsersService,
    AdminCatalogService,
    AdminReportsService,
    AdminUsageService,
    AdminApiKeysService,
  ],
  exports: [AdminApiKeysService],
})
export class AdminModule {}
