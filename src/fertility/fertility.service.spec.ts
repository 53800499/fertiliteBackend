import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '../../test/test-utils';
import { FertilityService } from './fertility.service';
import { Prediction } from './entities/prediction.entity';
import { FacteurExplicatif } from './entities/facteur-explicatif.entity';
import { VersionMoteurPrediction } from './entities/version-moteur-prediction.entity';
import { ProfilUtilisateur } from '../users/entities/profil-utilisateur.entity';
import { Cycle, StatutCycleEnum } from '../cycles/entities/cycle.entity';
import { JourRegles } from '../cycles/entities/jour-regles.entity';
import { HybridEngine } from './engines/hybrid.engine';
import { ObservationsService } from '../observations/observations.service';
import { DataSource } from 'typeorm';

describe('FertilityService (Module 4 - M4)', () => {
  let service: FertilityService;

  const mockPredictionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => ({ id: 'pred-1', ...dto })),
    save: jest.fn((dto) => Promise.resolve({ id: 'pred-1', ...dto })),
  };

  const mockFacteurRepo = {
    find: jest.fn(),
    create: jest.fn((dto) => ({ id: 'fact-1', ...dto })),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockVersionMoteurRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'ver-1', ...dto })),
    save: jest.fn((dto) => Promise.resolve({ id: 'ver-1', ...dto })),
  };

  const mockProfilRepo = {
    findOne: jest.fn(),
  };

  const mockCycleRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockJourReglesRepo = {
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockHybridEngine = {
    estimate: jest.fn().mockResolvedValue({
      estimatedOvulationDate: '2026-10-15',
      uncertaintyMarginDays: 1,
      fertileWindowStartDate: '2026-10-09',
      fertileWindowEndDate: '2026-10-17',
      fertilityCategory: 'moyenne',
      fertilityScoreValue: 65,
      confidenceLevel: 'moyen',
      algorithm: 'calendar_v1',
      modelVersion: 'v1.0-calendrier',
      method: 'calendrier_statistique',
      factors: [
        {
          factorType: 'historique_cycles',
          description: 'Cycles réguliers',
          contributionWeight: 0.45,
          effectDirection: 'renforce',
          displayOrder: 1,
        },
      ],
    }),
  };

  const mockObservationsService = {
    getObservationsHistory: jest.fn().mockResolvedValue({
      temperatures: [],
      glaires: [],
      testsLh: [],
      symptomes: [],
    }),
    getDayObservations: jest.fn().mockResolvedValue({
      date: '2026-10-15',
      temperature: null,
      glaire: null,
      testsLh: [],
      symptomes: [],
    }),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((entity, dto) => ({ id: 'saved-id', ...dto })),
      save: jest.fn((entity, dto) => Promise.resolve(dto || { id: 'saved-id' })),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FertilityService,
        { provide: getRepositoryToken(Prediction), useValue: mockPredictionRepo },
        { provide: getRepositoryToken(FacteurExplicatif), useValue: mockFacteurRepo },
        { provide: getRepositoryToken(VersionMoteurPrediction), useValue: mockVersionMoteurRepo },
        { provide: getRepositoryToken(ProfilUtilisateur), useValue: mockProfilRepo },
        { provide: getRepositoryToken(Cycle), useValue: mockCycleRepo },
        { provide: getRepositoryToken(JourRegles), useValue: mockJourReglesRepo },
        { provide: HybridEngine, useValue: mockHybridEngine },
        { provide: ObservationsService, useValue: mockObservationsService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<FertilityService>(FertilityService);
    jest.clearAllMocks();
  });

  describe('calculateAndSavePrediction', () => {
    it('calcule et persiste de manière append-only une nouvelle prédiction', async () => {
      mockProfilRepo.findOne.mockResolvedValue({
        dureeCycleHabituelleJours: 28,
        dureeReglesHabituelleJours: 5,
        irregulariteDeclaree: false,
      });

      mockCycleRepo.find.mockResolvedValue([
        {
          id: 'cycle-1',
          dateDebut: '2026-10-01',
          statut: StatutCycleEnum.EN_COURS,
        },
      ]);

      mockVersionMoteurRepo.findOne.mockResolvedValue({
        id: 'ver-1',
        numeroVersion: 'v1.0-calendrier',
      });

      const result = await service.calculateAndSavePrediction('user-1', '2026-10-10');

      expect(mockHybridEngine.estimate).toHaveBeenCalled();
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Prediction,
        { utilisateurId: 'user-1', estActive: true },
        { estActive: false },
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.estimatedOvulationDate).toBe('2026-10-15');
      expect(result.fertilityCategory).toBe('moyenne');
    });
  });

  describe('getCurrentPrediction', () => {
    it('renvoie la prédiction active existante', async () => {
      mockPredictionRepo.findOne.mockResolvedValue({
        id: 'pred-1',
        dateGeneration: new Date(),
        dateOvulationEstimee: '2026-10-15',
        margeIncertitudeJours: 1,
        dateDebutFenetreFertile: '2026-10-09',
        dateFinFenetreFertile: '2026-10-17',
        scoreFertiliteCategorie: 'elevee',
        scoreFertiliteValeur: 85,
        niveauConfiance: 'eleve',
        methodeUtilisee: 'calendrier_statistique',
        versionMoteur: { numeroVersion: 'v1.0-calendrier' },
        facteurs: [
          {
            id: 'fact-1',
            typeFacteur: 'historique_cycles',
            description: 'Cycles réguliers',
            poidsContribution: 0.45,
            sensEffet: 'renforce',
            ordreAffichage: 1,
          },
        ],
      });

      const res = await service.getCurrentPrediction('user-1');

      expect(res.predictionId).toBe('pred-1');
      expect(res.fertilityScoreValue).toBe(85);
      expect(res.factors.length).toBe(1);
    });
  });

  describe('getMonthCalendar', () => {
    it('agrège le calendrier mensuel avec les drapeaux de fertilité et d ovulation', async () => {
      mockCycleRepo.findOne.mockResolvedValue({ id: 'cycle-active' });
      mockPredictionRepo.findOne.mockResolvedValue({
        id: 'pred-1',
        dateOvulationEstimee: '2026-10-15',
        dateDebutFenetreFertile: '2026-10-09',
        dateFinFenetreFertile: '2026-10-17',
        scoreFertiliteCategorie: 'moyenne',
        scoreFertiliteValeur: 60,
        niveauConfiance: 'moyen',
        methodeUtilisee: 'calendrier_statistique',
        facteurs: [],
      });

      const calendar = await service.getMonthCalendar('user-1', 2026, 10);

      expect(calendar.year).toBe(2026);
      expect(calendar.month).toBe(10);
      expect(calendar.days.length).toBe(31);

      const day15 = calendar.days.find((d) => d.date === '2026-10-15');
      expect(day15?.isOvulationDay).toBe(true);
      expect(day15?.isFertileDay).toBe(true);

      const day10 = calendar.days.find((d) => d.date === '2026-10-10');
      expect(day10?.isFertileDay).toBe(true);
      expect(day10?.isOvulationDay).toBe(false);

      const day1 = calendar.days.find((d) => d.date === '2026-10-01');
      expect(day1?.isFertileDay).toBe(false);
    });
  });
});
