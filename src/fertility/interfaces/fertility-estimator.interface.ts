export interface FertilityCycleHistory {
  cycleId: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  cycleLengthDays?: number | null;
  periodDurationDays?: number | null;
  isRegular?: boolean;
}

export interface FertilityObservationPoint {
  date: string; // YYYY-MM-DD
  flowIntensity?: 'absent' | 'spotting' | 'leger' | 'moyen' | 'abondant';
  basalTemperatureCelsius?: number;
  cervicalMucusType?: 'sec' | 'collant' | 'cremeux' | 'filant_blanc_oeuf' | 'aqueux';
  lhTestResult?: 'negatif' | 'faible' | 'positif' | 'pic';
  symptoms?: Array<{ code: string; intensity: number }>;
}

export interface FertilityInput {
  userId: string;
  cycleId?: string | null;
  currentCycleStartDate: string; // YYYY-MM-DD
  declaredCycleDurationDays?: number;
  declaredPeriodDurationDays?: number;
  declaredIrregularity?: boolean;
  history: FertilityCycleHistory[];
  observations: FertilityObservationPoint[];
  evaluationDate?: string; // YYYY-MM-DD (défaut: aujourd'hui)
}

export interface FactorExplanationOutput {
  factorType:
    | 'historique_cycles'
    | 'regularite'
    | 'temperature_basale'
    | 'glaire_cervicale'
    | 'test_ovulation'
    | 'symptome'
    | 'position_dans_cycle';
  description: string;
  contributionWeight: number; // 0.000 à 1.000
  effectDirection: 'renforce' | 'diminue' | 'neutre';
  displayOrder: number;
}

export interface FertilityPredictionOutput {
  estimatedOvulationDate: string; // YYYY-MM-DD
  uncertaintyMarginDays: number; // ± N jours
  fertileWindowStartDate: string; // YYYY-MM-DD
  fertileWindowEndDate: string; // YYYY-MM-DD
  fertilityCategory: 'faible' | 'moyenne' | 'elevee';
  fertilityScoreValue: number; // 0 à 100
  confidenceLevel: 'faible' | 'moyen' | 'eleve';
  algorithm: 'calendar_v1' | 'statistical_v1' | 'ml_v1';
  modelVersion: string; // Ex: 'v1.0-calendrier'
  method: 'calendrier_statistique' | 'indicateurs_combines' | 'modele_ml';
  factors: FactorExplanationOutput[];
}

export interface FertilityEstimator {
  readonly version: string;
  readonly algorithmName: 'calendar_v1' | 'statistical_v1' | 'ml_v1';
  estimate(input: FertilityInput): Promise<FertilityPredictionOutput>;
}
