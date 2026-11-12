import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { ProfilUtilisateur } from '../../users/entities/profil-utilisateur.entity';
import { Cycle } from '../../cycles/entities/cycle.entity';
import { Prediction } from '../../fertility/entities/prediction.entity';
import { Abonnement } from '../../subscriptions/entities/abonnement.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { HealthcareProfessional } from '../../super-admin/entities/healthcare-professional.entity';
import { EditorialContent } from '../../super-admin/entities/editorial-content.entity';
import { SupportTicket } from '../../super-admin/entities/support-ticket.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utilisateur,
      ProfilUtilisateur,
      Cycle,
      Prediction,
      Abonnement,
      Consentement,
      HealthcareProfessional,
      EditorialContent,
      SupportTicket,
    ]),
    SubscriptionsModule,
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}

