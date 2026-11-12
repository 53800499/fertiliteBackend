import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorialContent } from '../../super-admin/entities/editorial-content.entity';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { AdminContentsService } from './admin-contents.service';
import { AdminContentsController } from './admin-contents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EditorialContent]), SubscriptionsModule],
  controllers: [AdminContentsController],
  providers: [AdminContentsService],
})
export class AdminContentsModule {}

