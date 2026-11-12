import { Module } from '@nestjs/common';
import { AdminAuditModule } from './shared/admin-audit.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminProfessionalsModule } from './professionals/admin-professionals.module';
import { AdminContentsModule } from './contents/admin-contents.module';
import { AdminOffersModule } from './offers/admin-offers.module';
import { AdminPromotionsModule } from './promotions/admin-promotions.module';
import { AdminPaymentsModule } from './payments/admin-payments.module';
import { AdminCampaignsModule } from './campaigns/admin-campaigns.module';
import { AdminSupportModule } from './support/admin-support.module';
import { AdminSecurityModule } from './security/admin-security.module';
import { AdminSettingsModule } from './settings/admin-settings.module';
import { AdminMonitoringModule } from './monitoring/admin-monitoring.module';

@Module({
  imports: [
    AdminAuditModule,
    AdminDashboardModule,
    AdminUsersModule,
    AdminProfessionalsModule,
    AdminContentsModule,
    AdminOffersModule,
    AdminPromotionsModule,
    AdminPaymentsModule,
    AdminCampaignsModule,
    AdminSupportModule,
    AdminSecurityModule,
    AdminSettingsModule,
    AdminMonitoringModule,
  ],
})
export class AdminModule {}

