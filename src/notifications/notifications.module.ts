import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { PreferenceNotification } from './entities/preference-notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Prediction } from '../fertility/entities/prediction.entity';
import { Cycle } from '../cycles/entities/cycle.entity';
import { JourRegles } from '../cycles/entities/jour-regles.entity';
import { TemperatureBasale } from '../observations/entities/temperature-basale.entity';
import { GlaireCervicale } from '../observations/entities/glaire-cervicale.entity';
import { ObservationSymptome } from '../observations/entities/observation-symptome.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      PreferenceNotification,
      Prediction,
      Cycle,
      JourRegles,
      TemperatureBasale,
      GlaireCervicale,
      ObservationSymptome,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
