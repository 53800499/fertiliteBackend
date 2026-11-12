import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { NotificationCampaign } from '../../super-admin/entities/notification-campaign.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminCampaignsService } from './admin-campaigns.service';
import { AdminCampaignsController } from './admin-campaigns.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationCampaign, Utilisateur]),
    SubscriptionsModule,
  ],
  controllers: [AdminCampaignsController],
  providers: [AdminCampaignsService],
})
export class AdminCampaignsModule {}

