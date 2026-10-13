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
export class StatisticalEngine implements FertilityEstimator {
  readonly version = 'v2.0-statistique';
  readonly algorithmName = 'statistical_v1';

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

    // 1. Calcul référence cycle
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

    // 2. Détection des biomarqueurs dans les observations récentes
    const recentObs = input.observations || [];
    const positiveLhObs = recentObs.find(
      (o) => o.lhTestResult === 'positif' || o.lhTestResult === 'pic',
    );
    const fertileMucusObs = recentObs.find(
      (o) =>
        o.cervicalMucusType === 'filant_blanc_oeuf' ||
        o.cervicalMucusType === 'aqueux',
    );

    // Détection décalage thermique basale (température >= 36.8 ou hausse relative)
    const temps = recentObs
      .filter((o) => o.basalTemperatureCelsius && o.basalTemperatureCelsius > 0)
      .map((o) => o.basalTemperatureCelsius!);
    const hasThermalShift =
      temps.length >= 3 &&
      temps.slice(-3).every((t) => t >= 36.8 || t > temps[0] + 0.2);

    // 3. Calcul de la date d'ovulation
    let estimatedOvulationDate: string;
    let uncertaintyMarginDays: number;

    if (positiveLhObs) {
      // Pic de LH détecté : ovulation projetée dans les 24h-36h (J_test + 1)
      const lhDate = new Date(positiveLhObs.date);
      lhDate.setDate(lhDate.getDate() + 1);
      estimatedOvulationDate = lhDate.toISOString().split('T')[0];
      uncertaintyMarginDays = 1; // Précision accrue à ± 1 jour
    } else {
      const standardOvulation = this.ovulationPredictor.predictOvulation(
        input.currentCycleStartDate,
        referenceDuration,
        standardDeviation,
        completedCount,
        input.declaredIrregularity,
      );
      estimatedOvulationDate = standardOvulation.estimatedOvulationDate;
      uncertaintyMarginDays = standardOvulation.uncertaintyMarginDays;
    }

    // 4. Bornes fenêtre fertile
    const fertileWindow = this.fertileWindowPredictor.calculateWindow(
      estimatedOvulationDate,
      uncertaintyMarginDays,
    );

    // 5. Bonus de probabilité sur le score du jour
    let biomarkerBonus = 0;
    if (fertileMucusObs) biomarkerBonus += 15.0;
    if (positiveLhObs) biomarkerBonus += 25.0;

    const evalDate =
      input.evaluationDate || new Date().toISOString().split('T')[0];
    const dailyScore = this.fertileWindowPredictor.calculateScoreForDate(
      evalDate,
      estimatedOvulationDate,
      biomarkerBonus,
    );

    // 6. Confiance avec intégration biomarqueurs
    const confidenceLevel = this.confidenceService.evaluateConfidence({
      completedCyclesCount: completedCount,
      standardDeviation,
      isIrregularDeclared: !!input.declaredIrregularity,
      hasConvergentBiomarker: !!(positiveLhObs || fertileMucusObs),
    });

    // 7. Facteurs explicatifs enrichis
    const factors = this.explanationService.generateExplanations({
      completedCyclesCount: completedCount,
      averageCycleDuration: referenceDuration,
      standardDeviation,
      spreadDays,
      isIrregularDeclared: !!input.declaredIrregularity,
      estimatedOvulationDate,
      hasPositiveLhTest: !!positiveLhObs,
      hasFertileMucus: !!fertileMucusObs,
      hasThermalShift,
    });

    return {
      estimatedOvulationDate,
      uncertaintyMarginDays,
      fertileWindowStartDate: fertileWindow.startDate,
      fertileWindowEndDate: fertileWindow.endDate,
      fertilityCategory: dailyScore.category,
      fertilityScoreValue: dailyScore.scoreValue,
      confidenceLevel,
      algorithm: this.algorithmName,
      modelVersion: this.version,
      method: 'indicateurs_combines',
      factors,
    };
  }
}
