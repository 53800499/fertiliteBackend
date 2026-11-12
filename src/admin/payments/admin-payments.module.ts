import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abonnement } from '../../subscriptions/entities/abonnement.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Abonnement]), SubscriptionsModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}

