import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthcareProfessional } from '../../super-admin/entities/healthcare-professional.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminProfessionalsService } from './admin-professionals.service';
import { AdminProfessionalsController } from './admin-professionals.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HealthcareProfessional]), SubscriptionsModule],
  controllers: [AdminProfessionalsController],
  providers: [AdminProfessionalsService],
})
export class AdminProfessionalsModule {}

