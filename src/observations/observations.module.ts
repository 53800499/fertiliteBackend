import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemperatureBasale } from './entities/temperature-basale.entity';
import { GlaireCervicale } from './entities/glaire-cervicale.entity';
import { TestOvulation } from './entities/test-ovulation.entity';
import { TypeSymptome } from './entities/type-symptome.entity';
import { ObservationSymptome } from './entities/observation-symptome.entity';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TemperatureBasale,
      GlaireCervicale,
      TestOvulation,
      TypeSymptome,
      ObservationSymptome,
    ]),
  ],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
