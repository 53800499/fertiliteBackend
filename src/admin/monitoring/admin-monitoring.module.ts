import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminMonitoringService } from './admin-monitoring.service';
import { AdminMonitoringController } from './admin-monitoring.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), SubscriptionsModule],
  controllers: [AdminMonitoringController],
  providers: [AdminMonitoringService],
})
export class AdminMonitoringModule {}

