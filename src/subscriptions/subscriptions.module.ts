import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Abonnement } from './entities/abonnement.entity';
import { Parrainage } from './entities/parrainage.entity';
import { AbonnementPolitique } from './entities/abonnement-politique.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { SubscriptionsService } from './subscriptions.service';
import { FedaPayService } from './fedapay.service';
import { PremiumGuard } from './guards/premium.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import {
  SubscriptionsController,
  SubscriptionWebhookController,
  SubscriptionPolicyController,
  AdminSubscriptionsController,
  ReferralsController,
} from './subscriptions.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Abonnement,
      Parrainage,
      AbonnementPolitique,
      Utilisateur,
    ]),
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionWebhookController,
    SubscriptionPolicyController,
    AdminSubscriptionsController,
    ReferralsController,
  ],
  providers: [SubscriptionsService, FedaPayService, PremiumGuard, SuperAdminGuard],
  exports: [SubscriptionsService, FedaPayService, PremiumGuard, SuperAdminGuard],
})
export class SubscriptionsModule {}

