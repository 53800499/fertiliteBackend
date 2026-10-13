import { Injectable } from '@nestjs/common';

export interface OvulationPredictionResult {
  estimatedOvulationDate: string; // YYYY-MM-DD
  uncertaintyMarginDays: number;
  referenceCycleDuration: number;
}

@Injectable()
export class OvulationPredictor {
  /**
   * Calcule la date d'ovulation prévisionnelle basée sur la règle de phase lutéale fixe (14 jours)
   */
  predictOvulation(
    cycleStartDate: string,
    referenceCycleDuration: number,
    standardDeviation: number,
    historyCount: number,
    irregularDeclared = false,
  ): OvulationPredictionResult {
    const start = new Date(cycleStartDate);
    
    // Règle biologique : Ovulation = Date début + (Durée référence - 14 jours)
    const lutealPhaseDays = 14;
    const ovulationDayOffset = Math.max(1, referenceCycleDuration - lutealPhaseDays);

    const ovulationDate = new Date(start);
    ovulationDate.setDate(ovulationDate.getDate() + ovulationDayOffset);
    const estimatedOvulationDate = ovulationDate.toISOString().split('T')[0];

    // Marge d'incertitude selon régularité statistique
    let uncertaintyMarginDays = 2;
    if (historyCount < 2 || irregularDeclared) {
      uncertaintyMarginDays = 3;
    } else if (standardDeviation <= 1.5 && historyCount >= 3) {
      uncertaintyMarginDays = 1;
    } else if (standardDeviation <= 3.0) {
      uncertaintyMarginDays = 2;
    } else {
      uncertaintyMarginDays = 3;
    }

    return {
      estimatedOvulationDate,
      uncertaintyMarginDays,
      referenceCycleDuration,
    };
  }
}
