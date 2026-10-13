import { Injectable } from '@nestjs/common';
import {
  FertilityEstimator,
  FertilityInput,
  FertilityPredictionOutput,
} from '../interfaces/fertility-estimator.interface';
import { CalendarEngine } from './calendar.engine';
import { StatisticalEngine } from './statistical.engine';

@Injectable()
export class HybridEngine implements FertilityEstimator {
  readonly version = 'v1.5-hybride';
  readonly algorithmName = 'calendar_v1';

  constructor(
    private readonly calendarEngine: CalendarEngine,
    private readonly statisticalEngine: StatisticalEngine,
  ) {}

  async estimate(input: FertilityInput): Promise<FertilityPredictionOutput> {
    // Si des observations biologiques significatives sont renseignées, on utilise le moteur statistique
    const hasBiomarkers =
      input.observations &&
      input.observations.some(
        (obs) =>
          obs.lhTestResult ||
          obs.cervicalMucusType ||
          (obs.basalTemperatureCelsius && obs.basalTemperatureCelsius > 0),
      );

    if (hasBiomarkers) {
      return this.statisticalEngine.estimate(input);
    }

    return this.calendarEngine.estimate(input);
  }
}
