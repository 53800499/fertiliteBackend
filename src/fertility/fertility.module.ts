import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prediction } from './entities/prediction.entity';
import { FacteurExplicatif } from './entities/facteur-explicatif.entity';
import { VersionMoteurPrediction } from './entities/version-moteur-prediction.entity';
import { ProfilUtilisateur } from '../users/entities/profil-utilisateur.entity';
import { Cycle } from '../cycles/entities/cycle.entity';
import { JourRegles } from '../cycles/entities/jour-regles.entity';
import { ObservationsModule } from '../observations/observations.module';
import { FertilityService } from './fertility.service';
import { FertilityController } from './fertility.controller';
import { CalendarController } from './calendar.controller';
import { OvulationPredictor } from './predictors/ovulation.predictor';
import { FertileWindowPredictor } from './predictors/fertile-window.predictor';
import { ConfidenceService } from './confidence/confidence.service';
import { ExplanationService } from './explanations/explanation.service';
import { CalendarEngine } from './engines/calendar.engine';
import { StatisticalEngine } from './engines/statistical.engine';
import { HybridEngine } from './engines/hybrid.engine';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prediction,
      FacteurExplicatif,
      VersionMoteurPrediction,
      ProfilUtilisateur,
      Cycle,
      JourRegles,
    ]),
    ObservationsModule,
  ],
  controllers: [FertilityController, CalendarController],
  providers: [
    OvulationPredictor,
    FertileWindowPredictor,
    ConfidenceService,
    ExplanationService,
    CalendarEngine,
    StatisticalEngine,
    HybridEngine,
    FertilityService,
  ],
  exports: [FertilityService, HybridEngine],
})
export class FertilityModule {}
