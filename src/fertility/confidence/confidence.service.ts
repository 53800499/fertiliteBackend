import { Injectable } from '@nestjs/common';
import { NiveauConfianceEnum } from '../entities/fertility-enums';

export interface ConfidenceEvaluationParams {
  completedCyclesCount: number;
  standardDeviation: number;
  isIrregularDeclared: boolean;
  hasConvergentBiomarker?: boolean; // ex: test LH positif ou glaire fertile
}

@Injectable()
export class ConfidenceService {
  /**
   * Évalue le niveau de confiance selon la matrice décisionnelle
   */
  evaluateConfidence(params: ConfidenceEvaluationParams): NiveauConfianceEnum {
    const {
      completedCyclesCount,
      standardDeviation,
      isIrregularDeclared,
      hasConvergentBiomarker = false,
    } = params;

    let level: NiveauConfianceEnum = NiveauConfianceEnum.FAIBLE;

    if (completedCyclesCount < 2 || isIrregularDeclared || standardDeviation > 4.0) {
      level = NiveauConfianceEnum.FAIBLE;
    } else if (completedCyclesCount >= 6 && standardDeviation <= 1.5) {
      level = NiveauConfianceEnum.ELEVE;
    } else if (completedCyclesCount >= 2 && standardDeviation <= 2.5) {
      level = NiveauConfianceEnum.MOYEN;
    } else {
      level = NiveauConfianceEnum.FAIBLE;
    }

    // Majoration d'un cran si présence d'un indicateur biologique convergent
    if (hasConvergentBiomarker) {
      if (level === NiveauConfianceEnum.FAIBLE) {
        level = NiveauConfianceEnum.MOYEN;
      } else if (level === NiveauConfianceEnum.MOYEN) {
        level = NiveauConfianceEnum.ELEVE;
      }
    }

    return level;
  }
}
