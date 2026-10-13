import { Injectable } from '@nestjs/common';
import {
  FertilityEstimator,
  FertilityInput,
  FertilityPredictionOutput,
} from '../interfaces/fertility-estimator.interface';
import { OvulationPredictor } from '../predictors/ovulation.predictor';
import { FertileWindowPredictor } from '../predictors/fertile-window.predictor';
import { ConfidenceService } from '../confidence/confidence.service';
import { ExplanationService } from '../explanations/explanation.service';

@Injectable()
export class CalendarEngine implements FertilityEstimator {
  readonly version = 'v1.0-calendrier';
  readonly algorithmName = 'calendar_v1';

  constructor(
    private readonly ovulationPredictor: OvulationPredictor,
    private readonly fertileWindowPredictor: FertileWindowPredictor,
    private readonly confidenceService: ConfidenceService,
    private readonly explanationService: ExplanationService,
  ) {}

  async estimate(input: FertilityInput): Promise<FertilityPredictionOutput> {
    const completedCycles = input.history.filter(
      (h) => h.cycleLengthDays && h.cycleLengthDays > 0,
    );
    const completedCount = completedCycles.length;

    // 1. Calcul de la durée de référence D_ref
    let referenceDuration = input.declaredCycleDurationDays || 28;
    let standardDeviation = 0.0;
    let spreadDays = 0;

    if (completedCount >= 2) {
      const sum = completedCycles.reduce(
        (acc, c) => acc + (c.cycleLengthDays || 28),
        0,
      );
      referenceDuration = Math.round((sum / completedCount) * 10) / 10;

      const variance =
        completedCycles.reduce(
          (acc, c) =>
            acc + Math.pow((c.cycleLengthDays || 28) - referenceDuration, 2),
          0,
        ) / completedCount;
      standardDeviation = Math.round(Math.sqrt(variance) * 10) / 10;

      const lengths = completedCycles.map((c) => c.cycleLengthDays || 28);
      spreadDays = Math.max(...lengths) - Math.min(...lengths);
    }

    // 2. Prédiction de la date d'ovulation
    const ovulationResult = this.ovulationPredictor.predictOvulation(
      input.currentCycleStartDate,
      referenceDuration,
      standardDeviation,
      completedCount,
      input.declaredIrregularity,
    );

    // 3. Fenêtre fertile clinique
    const fertileWindow = this.fertileWindowPredictor.calculateWindow(
      ovulationResult.estimatedOvulationDate,
      ovulationResult.uncertaintyMarginDays,
    );

    // 4. Score du jour évalué (par défaut: aujourd'hui)
    const evalDate =
      input.evaluationDate || new Date().toISOString().split('T')[0];
    const dailyScore = this.fertileWindowPredictor.calculateScoreForDate(
      evalDate,
      ovulationResult.estimatedOvulationDate,
      0,
    );

    // 5. Niveau de confiance
    const confidenceLevel = this.confidenceService.evaluateConfidence({
      completedCyclesCount: completedCount,
      standardDeviation,
      isIrregularDeclared: !!input.declaredIrregularity,
    });

    // 6. Facteurs explicatifs
    const factors = this.explanationService.generateExplanations({
      completedCyclesCount: completedCount,
      averageCycleDuration: referenceDuration,
      standardDeviation,
      spreadDays,
      isIrregularDeclared: !!input.declaredIrregularity,
      estimatedOvulationDate: ovulationResult.estimatedOvulationDate,
    });

    return {
      estimatedOvulationDate: ovulationResult.estimatedOvulationDate,
      uncertaintyMarginDays: ovulationResult.uncertaintyMarginDays,
      fertileWindowStartDate: fertileWindow.startDate,
      fertileWindowEndDate: fertileWindow.endDate,
      fertilityCategory: dailyScore.category,
      fertilityScoreValue: dailyScore.scoreValue,
      confidenceLevel,
      algorithm: this.algorithmName,
      modelVersion: this.version,
      method: 'calendrier_statistique',
      factors,
    };
  }
}
