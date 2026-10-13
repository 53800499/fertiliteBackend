import { Injectable } from '@nestjs/common';
import { CategorieFertiliteEnum } from '../entities/fertility-enums';

export interface FertileWindowResult {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DailyFertilityScore {
  scoreValue: number; // 0.0 à 100.0
  category: CategorieFertiliteEnum;
}

@Injectable()
export class FertileWindowPredictor {
  /**
   * Calcule les bornes de la fenêtre fertile clinique :
   * Début = J_ovu - 5 jours - marge
   * Fin = J_ovu + 1 jour + marge
   */
  calculateWindow(
    estimatedOvulationDate: string,
    uncertaintyMarginDays: number,
  ): FertileWindowResult {
    const ovuDate = new Date(estimatedOvulationDate);

    // Début : 5 jours de viabilité des spermatozoïdes + marge incertitude
    const startDate = new Date(ovuDate);
    startDate.setDate(startDate.getDate() - 5 - uncertaintyMarginDays);

    // Fin : 24h de viabilité de l'ovocyte + marge incertitude
    const endDate = new Date(ovuDate);
    endDate.setDate(endDate.getDate() + 1 + uncertaintyMarginDays);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * Calcule le score continu et la catégorie selon la position par rapport à l'ovulation (Courbe de Wilcox)
   */
  calculateScoreForDate(
    targetDateStr: string,
    estimatedOvulationDateStr: string,
    bonusScore = 0,
  ): DailyFertilityScore {
    const targetDate = new Date(targetDateStr);
    const ovuDate = new Date(estimatedOvulationDateStr);

    const diffTime = targetDate.getTime() - ovuDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // t - J_ovu

    let baseScore = 5.0;

    switch (diffDays) {
      case -5:
        baseScore = 15.0;
        break;
      case -4:
        baseScore = 30.0;
        break;
      case -3:
        baseScore = 55.0;
        break;
      case -2:
        baseScore = 85.0;
        break;
      case -1:
        baseScore = 95.0;
        break;
      case 0:
        baseScore = 80.0;
        break;
      case 1:
        baseScore = 25.0;
        break;
      default:
        if (diffDays < -5) {
          baseScore = 5.0;
        } else {
          baseScore = 5.0;
        }
        break;
    }

    // Application du bonus de biomarqueurs (glaire, LH, etc.)
    const scoreValue = Math.min(100.0, Math.max(0.0, baseScore + bonusScore));

    let category = CategorieFertiliteEnum.FAIBLE;
    if (scoreValue >= 70.0) {
      category = CategorieFertiliteEnum.ELEVEE;
    } else if (scoreValue >= 35.0) {
      category = CategorieFertiliteEnum.MOYENNE;
    } else {
      category = CategorieFertiliteEnum.FAIBLE;
    }

    return {
      scoreValue: Math.round(scoreValue * 10) / 10,
      category,
    };
  }
}
