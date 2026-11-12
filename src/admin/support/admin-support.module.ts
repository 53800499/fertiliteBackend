import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../../super-admin/entities/support-ticket.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminSupportService } from './admin-support.service';
import { AdminSupportController } from './admin-support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket]), SubscriptionsModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class AdminSupportModule {}

