import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrivacyModule } from './privacy/privacy.module';
import { CyclesModule } from './cycles/cycles.module';
import { ObservationsModule } from './observations/observations.module';
import { FertilityModule } from './fertility/fertility.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    PrivacyModule,
    CyclesModule,
    ObservationsModule,
    FertilityModule,
    NotificationsModule,
    SubscriptionsModule,
    SuperAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
