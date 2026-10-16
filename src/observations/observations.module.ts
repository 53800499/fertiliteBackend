import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemperatureBasale } from './entities/temperature-basale.entity';
import { GlaireCervicale } from './entities/glaire-cervicale.entity';
import { TestOvulation } from './entities/test-ovulation.entity';
import { TypeSymptome } from './entities/type-symptome.entity';
import { ObservationSymptome } from './entities/observation-symptome.entity';
import { RapportSexuel } from './entities/rapport-sexuel.entity';
import { EncryptionService } from '../common/services/encryption.service';
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
      RapportSexuel,
    ]),
  ],
  controllers: [ObservationsController],
  providers: [ObservationsService, EncryptionService],
  exports: [ObservationsService, EncryptionService],
})
export class ObservationsModule {}
