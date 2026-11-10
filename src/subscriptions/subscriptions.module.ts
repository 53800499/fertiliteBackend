import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abonnement } from './entities/abonnement.entity';
import { Parrainage } from './entities/parrainage.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { SubscriptionsService } from './subscriptions.service';
import {
  SubscriptionsController,
  ReferralsController,
} from './subscriptions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Abonnement, Parrainage, Utilisateur]),
  ],
  controllers: [SubscriptionsController, ReferralsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}

