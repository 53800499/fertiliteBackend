import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { ProfilUtilisateur } from '../users/entities/profil-utilisateur.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';
import { Cycle } from '../cycles/entities/cycle.entity';
import { Prediction } from '../fertility/entities/prediction.entity';
import { Abonnement } from '../subscriptions/entities/abonnement.entity';
import { Consentement } from '../privacy/entities/consentement.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { HealthcareProfessional } from './entities/healthcare-professional.entity';
import { EditorialContent } from './entities/editorial-content.entity';
import { SubscriptionOffer } from './entities/subscription-offer.entity';
import { PromoCode } from './entities/promo-code.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { NotificationCampaign } from './entities/notification-campaign.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utilisateur,
      ProfilUtilisateur,
      SessionAuthentification,
      Cycle,
      Prediction,
      Abonnement,
      Consentement,
      Notification,
      AdminAuditLog,
      HealthcareProfessional,
      EditorialContent,
      SubscriptionOffer,
      PromoCode,
      SupportTicket,
      NotificationCampaign,
      PlatformSettings,
    ]),
    SubscriptionsModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}

