import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from '../../super-admin/entities/promo-code.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminPromotionsService } from './admin-promotions.service';
import { AdminPromotionsController } from './admin-promotions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode]), SubscriptionsModule],
  controllers: [AdminPromotionsController],
  providers: [AdminPromotionsService],
})
export class AdminPromotionsModule {}

