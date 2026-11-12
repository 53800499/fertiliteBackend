import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminSecurityService } from './admin-security.service';
import { AdminSecurityController } from './admin-security.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, Consentement]), SubscriptionsModule],
  controllers: [AdminSecurityController],
  providers: [AdminSecurityService],
})
export class AdminSecurityModule {}

