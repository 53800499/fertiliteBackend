import { OvulationPredictor } from '../predictors/ovulation.predictor';
import { FertileWindowPredictor } from '../predictors/fertile-window.predictor';
import { ConfidenceService } from '../confidence/confidence.service';
import { ExplanationService } from '../explanations/explanation.service';
import { CalendarEngine } from './calendar.engine';
import { StatisticalEngine } from './statistical.engine';
import { HybridEngine } from './hybrid.engine';
import { FertilityInput } from '../interfaces/fertility-estimator.interface';

describe('Fertility Engine Components (Module 4 - M4)', () => {
  let ovulationPredictor: OvulationPredictor;
  let fertileWindowPredictor: FertileWindowPredictor;
  let confidenceService: ConfidenceService;
  let explanationService: ExplanationService;
  let calendarEngine: CalendarEngine;
  let statisticalEngine: StatisticalEngine;
  let hybridEngine: HybridEngine;

  beforeEach(() => {
    ovulationPredictor = new OvulationPredictor();
    fertileWindowPredictor = new FertileWindowPredictor();
    confidenceService = new ConfidenceService();
    explanationService = new ExplanationService();

    calendarEngine = new CalendarEngine(
      ovulationPredictor,
      fertileWindowPredictor,
      confidenceService,
      explanationService,
    );

    statisticalEngine = new StatisticalEngine(
      ovulationPredictor,
      fertileWindowPredictor,
      confidenceService,
      explanationService,
    );

    hybridEngine = new HybridEngine(calendarEngine, statisticalEngine);
  });

  describe('OvulationPredictor', () => {
    it('calcule la date d ovulation avec la phase lutéale fixe de 14 jours (28j -> J14)', () => {
      const res = ovulationPredictor.predictOvulation('2026-10-01', 28, 1.0, 5, false);
      expect(res.estimatedOvulationDate).toBe('2026-10-15');
      expect(res.uncertaintyMarginDays).toBe(1);
    });

    it('calcule la date d ovulation pour un cycle plus long (32j -> J18)', () => {
      const res = ovulationPredictor.predictOvulation('2026-10-01', 32, 1.2, 4, false);
      expect(res.estimatedOvulationDate).toBe('2026-10-19');
    });

    it('assigne une marge de 3 jours si historique insuffisant (< 2 cycles)', () => {
      const res = ovulationPredictor.predictOvulation('2026-10-01', 28, 0, 1, false);
      expect(res.uncertaintyMarginDays).toBe(3);
    });
  });

  describe('FertileWindowPredictor', () => {
    it('calcule les bornes de la fenêtre fertile (J_ovu - 5 - marge jusqu à J_ovu + 1 + marge)', () => {
      const res = fertileWindowPredictor.calculateWindow('2026-10-15', 1);
      // Ovu = 15 oct. Début = 15 - 5 - 1 = 9 oct. Fin = 15 + 1 + 1 = 17 oct.
      expect(res.startDate).toBe('2026-10-09');
      expect(res.endDate).toBe('2026-10-17');
    });

    it('attribue le score maximal à J - 1 de l ovulation selon la courbe de Wilcox', () => {
      const scoreBeforeOvu = fertileWindowPredictor.calculateScoreForDate('2026-10-14', '2026-10-15');
      expect(scoreBeforeOvu.scoreValue).toBe(95);
      expect(scoreBeforeOvu.category).toBe('elevee');

      const scoreAfterWindow = fertileWindowPredictor.calculateScoreForDate('2026-10-25', '2026-10-15');
      expect(scoreAfterWindow.scoreValue).toBe(5);
      expect(scoreAfterWindow.category).toBe('faible');
    });
  });

  describe('ConfidenceService', () => {
    it('retourne faible si moins de 2 cycles enregistrés', () => {
      const conf = confidenceService.evaluateConfidence({
        completedCyclesCount: 1,
        standardDeviation: 1.0,
        isIrregularDeclared: false,
      });
      expect(conf).toBe('faible');
    });

    it('retourne eleve si 6 cycles ou plus avec un faible écart-type (<= 1.5j)', () => {
      const conf = confidenceService.evaluateConfidence({
        completedCyclesCount: 6,
        standardDeviation: 1.1,
        isIrregularDeclared: false,
      });
      expect(conf).toBe('eleve');
    });

    it('majore la confiance d un cran en présence d un biomarqueur convergent', () => {
      const conf = confidenceService.evaluateConfidence({
        completedCyclesCount: 1,
        standardDeviation: 0,
        isIrregularDeclared: false,
        hasConvergentBiomarker: true,
      });
      expect(conf).toBe('moyen'); // faible majoré en moyen
    });
  });

  describe('CalendarEngine (Niveau 1)', () => {
    it('produit une estimation complète basée sur l historique', async () => {
      const input: FertilityInput = {
        userId: 'user-1',
        currentCycleStartDate: '2026-10-01',
        declaredCycleDurationDays: 28,
        history: [
          { cycleId: 'c1', startDate: '2026-08-05', cycleLengthDays: 28 },
          { cycleId: 'c2', startDate: '2026-09-02', cycleLengthDays: 29 },
          { cycleId: 'c3', startDate: '2026-07-08', cycleLengthDays: 28 },
        ],
        observations: [],
        evaluationDate: '2026-10-14',
      };

      const result = await calendarEngine.estimate(input);

      expect(result.algorithm).toBe('calendar_v1');
      expect(result.modelVersion).toBe('v1.0-calendrier');
      expect(result.estimatedOvulationDate).toBeDefined();
      expect(result.fertileWindowStartDate).toBeDefined();
      expect(result.fertileWindowEndDate).toBeDefined();
      expect(result.factors.length).toBeGreaterThanOrEqual(2);
      expect(result.factors[0].factorType).toBe('historique_cycles');
    });
  });

  describe('StatisticalEngine (Niveau 2)', () => {
    it('ajuste la prédiction d ovulation en cas de test LH positif', async () => {
      const input: FertilityInput = {
        userId: 'user-1',
        currentCycleStartDate: '2026-10-01',
        declaredCycleDurationDays: 28,
        history: [],
        observations: [
          {
            date: '2026-10-12',
            lhTestResult: 'positif',
          },
        ],
        evaluationDate: '2026-10-12',
      };

      const result = await statisticalEngine.estimate(input);

      expect(result.algorithm).toBe('statistical_v1');
      expect(result.modelVersion).toBe('v2.0-statistique');
      // Ovulation projetée à J_test + 1 = 2026-10-13
      expect(result.estimatedOvulationDate).toBe('2026-10-13');
      expect(result.uncertaintyMarginDays).toBe(1);
      expect(result.factors.some((f) => f.factorType === 'test_ovulation')).toBe(true);
    });
  });

  describe('HybridEngine', () => {
    it('délègue à StatisticalEngine quand des biomarqueurs sont présents', async () => {
      const inputWithBiomarkers: FertilityInput = {
        userId: 'user-1',
        currentCycleStartDate: '2026-10-01',
        history: [],
        observations: [{ date: '2026-10-10', cervicalMucusType: 'filant_blanc_oeuf' }],
      };

      const res = await hybridEngine.estimate(inputWithBiomarkers);
      expect(res.algorithm).toBe('statistical_v1');
    });

    it('délègue à CalendarEngine quand aucune observation biologique n est fournie', async () => {
      const inputWithoutBiomarkers: FertilityInput = {
        userId: 'user-1',
        currentCycleStartDate: '2026-10-01',
        history: [],
        observations: [],
      };

      const res = await hybridEngine.estimate(inputWithoutBiomarkers);
      expect(res.algorithm).toBe('calendar_v1');
    });
  });
});
