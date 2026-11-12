import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionOffer } from '../../super-admin/entities/subscription-offer.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminOffersService } from './admin-offers.service';
import { AdminOffersController } from './admin-offers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionOffer]), SubscriptionsModule],
  controllers: [AdminOffersController],
  providers: [AdminOffersService],
})
export class AdminOffersModule {}

