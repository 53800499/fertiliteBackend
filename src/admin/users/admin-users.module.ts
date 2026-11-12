import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { SessionAuthentification } from '../../auth/entities/session-authentification.entity';
import { Abonnement } from '../../subscriptions/entities/abonnement.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utilisateur,
      SessionAuthentification,
      Abonnement,
      Consentement,
    ]),
    SubscriptionsModule,
  ],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
})
export class AdminUsersModule {}

