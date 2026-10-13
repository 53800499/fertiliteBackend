import { Injectable } from '@nestjs/common';
import { FactorExplanationOutput } from '../interfaces/fertility-estimator.interface';

export interface ExplanationGenerationContext {
  completedCyclesCount: number;
  averageCycleDuration: number;
  standardDeviation: number;
  spreadDays: number;
  isIrregularDeclared: boolean;
  estimatedOvulationDate: string;
  hasPositiveLhTest?: boolean;
  hasFertileMucus?: boolean;
  hasThermalShift?: boolean;
}

@Injectable()
export class ExplanationService {
  /**
   * Génère les facteurs explicatifs rédigés en langage clair avec pondération
   */
  generateExplanations(context: ExplanationGenerationContext): FactorExplanationOutput[] {
    const factors: FactorExplanationOutput[] = [];
    let order = 1;

    // 1. Facteur Historique de cycles
    if (context.completedCyclesCount >= 2) {
      factors.push({
        factorType: 'historique_cycles',
        description: `Vos ${context.completedCyclesCount} derniers cycles enregistrés durent en moyenne ${context.averageCycleDuration} jours.`,
        contributionWeight: 0.45,
        effectDirection: 'renforce',
        displayOrder: order++,
      });
    } else {
      factors.push({
        factorType: 'historique_cycles',
        description: `Estimation basée sur vos déclarations de profil (${context.averageCycleDuration} jours), vos cycles réels n'étant pas encore assez nombreux.`,
        contributionWeight: 0.5,
        effectDirection: 'diminue',
        displayOrder: order++,
      });
    }

    // 2. Facteur Régularité
    if (context.isIrregularDeclared || context.standardDeviation > 3.0) {
      const spreadText = context.spreadDays > 0 ? ` (écart de ${context.spreadDays} jours)` : '';
      factors.push({
        factorType: 'regularite',
        description: `Vos cycles présentent une variabilité significative${spreadText}, ce qui élargit la marge d'incertitude.`,
        contributionWeight: 0.35,
        effectDirection: 'diminue',
        displayOrder: order++,
      });
    } else if (context.completedCyclesCount >= 2 && context.standardDeviation <= 1.5) {
      factors.push({
        factorType: 'regularite',
        description: `Vos cycles sont particulièrement réguliers (variation inférieure à 1.5 jour).`,
        contributionWeight: 0.35,
        effectDirection: 'renforce',
        displayOrder: order++,
      });
    }

    // 3. Biomarqueurs (si présents)
    if (context.hasPositiveLhTest) {
      factors.push({
        factorType: 'test_ovulation',
        description: `Votre test d'ovulation urinaire positif confirme le pic imminent d'hormone LH.`,
        contributionWeight: 0.6,
        effectDirection: 'renforce',
        displayOrder: order++,
      });
    }

    if (context.hasFertileMucus) {
      factors.push({
        factorType: 'glaire_cervicale',
        description: `L'observation d'une glaire cervicale filante indique des conditions optimales pour la viabilité des spermatozoïdes.`,
        contributionWeight: 0.4,
        effectDirection: 'renforce',
        displayOrder: order++,
      });
    }

    if (context.hasThermalShift) {
      factors.push({
        factorType: 'temperature_basale',
        description: `La hausse maintenue de votre température basale confirme rétrospectivement le passage de l'ovulation.`,
        contributionWeight: 0.45,
        effectDirection: 'renforce',
        displayOrder: order++,
      });
    }

    // 4. Règle biologique de position dans le cycle
    factors.push({
      factorType: 'position_dans_cycle',
      description: `Ovulation estimée au ${context.estimatedOvulationDate} en application d'une phase lutéale physiologique standard de 14 jours.`,
      contributionWeight: 0.2,
      effectDirection: 'neutre',
      displayOrder: order++,
    });

    return factors;
  }
}
