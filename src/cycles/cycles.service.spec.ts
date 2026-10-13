import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '../../test/test-utils';
import { CyclesService } from './cycles.service';
import { Cycle, StatutCycleEnum } from './entities/cycle.entity';
import { JourRegles, IntensiteFluxEnum } from './entities/jour-regles.entity';

describe('CyclesService (Module 2 - M2)', () => {
  let service: CyclesService;

  const mockCycleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-cycle-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-cycle-uuid', ...entity })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJourReglesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-jour-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-jour-uuid', ...entity })),
    count: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CyclesService,
        { provide: getRepositoryToken(Cycle), useValue: mockCycleRepo },
        { provide: getRepositoryToken(JourRegles), useValue: mockJourReglesRepo },
      ],
    }).compile();

    service = module.get<CyclesService>(CyclesService);
  });

  describe('startCycle (UC-07)', () => {
    it('devrait démarrer un nouveau cycle sans cycle actif préalable', async () => {
      mockCycleRepo.findOne
        .mockResolvedValueOnce(null) // no active cycle
        .mockResolvedValueOnce({
          id: 'mock-cycle-uuid',
          utilisateurId: 'user-1',
          dateDebut: '2026-09-01',
          statut: StatutCycleEnum.EN_COURS,
          joursRegles: [],
        }); // getCycleById

      const result = await service.startCycle('user-1', {
        dateDebut: '2026-09-01',
        intensiteFlux: IntensiteFluxEnum.MOYEN,
        douleurNiveau: 2,
      });

      expect(mockCycleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: 'user-1',
          dateDebut: '2026-09-01',
          statut: StatutCycleEnum.EN_COURS,
        }),
      );
      expect(mockJourReglesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cycleId: 'mock-cycle-uuid',
          date: '2026-09-01',
          intensiteFlux: IntensiteFluxEnum.MOYEN,
          douleurNiveau: 2,
        }),
      );
      expect(result).toBeDefined();
    });

    it('devrait clôturer automatiquement le cycle précédent au statut termine', async () => {
      const activeCycle = {
        id: 'cycle-prev',
        utilisateurId: 'user-1',
        dateDebut: '2026-08-01',
        statut: StatutCycleEnum.EN_COURS,
      };

      mockCycleRepo.findOne
        .mockResolvedValueOnce(activeCycle) // find active
        .mockResolvedValueOnce({ id: 'new-cycle', dateDebut: '2026-08-29' }); // getCycleById

      await service.startCycle('user-1', {
        dateDebut: '2026-08-29',
        intensiteFlux: IntensiteFluxEnum.ABONDANT,
      });

      expect(activeCycle.statut).toBe(StatutCycleEnum.TERMINE);
      expect(activeCycle.dateFin).toBe('2026-08-28');
      expect(mockCycleRepo.save).toHaveBeenCalledWith(activeCycle);
    });

    it('devrait refuser une date de début antérieure ou égale au cycle en cours', async () => {
      mockCycleRepo.findOne.mockResolvedValueOnce({
        id: 'cycle-prev',
        utilisateurId: 'user-1',
        dateDebut: '2026-09-10',
        statut: StatutCycleEnum.EN_COURS,
      });

      await expect(
        service.startCycle('user-1', { dateDebut: '2026-09-05' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logDayFlow (UC-08)', () => {
    it('devrait enregistrer un nouveau jour de flux dans le cycle actif', async () => {
      mockCycleRepo.findOne.mockResolvedValue({
        id: 'cycle-1',
        utilisateurId: 'user-1',
        statut: StatutCycleEnum.EN_COURS,
      });
      mockJourReglesRepo.findOne.mockResolvedValue(null);

      const result = await service.logDayFlow('user-1', {
        date: '2026-09-15',
        intensiteFlux: IntensiteFluxEnum.LEGER,
        douleurNiveau: 1,
      });

      expect(mockJourReglesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cycleId: 'cycle-1',
          date: '2026-09-15',
          intensiteFlux: IntensiteFluxEnum.LEGER,
        }),
      );
      expect(result).toBeDefined();
    });

    it('devrait mettre à jour un jour de flux déjà existant pour cette date', async () => {
      mockCycleRepo.findOne.mockResolvedValue({
        id: 'cycle-1',
        utilisateurId: 'user-1',
        statut: StatutCycleEnum.EN_COURS,
      });
      const existingDay = {
        id: 'jour-1',
        cycleId: 'cycle-1',
        date: '2026-09-15',
        intensiteFlux: IntensiteFluxEnum.LEGER,
        douleurNiveau: 1,
      };
      mockJourReglesRepo.findOne.mockResolvedValue(existingDay);

      await service.logDayFlow('user-1', {
        date: '2026-09-15',
        intensiteFlux: IntensiteFluxEnum.ABONDANT,
        douleurNiveau: 5,
        notes: 'Douleurs pelviennes',
      });

      expect(existingDay.intensiteFlux).toBe(IntensiteFluxEnum.ABONDANT);
      expect(existingDay.douleurNiveau).toBe(5);
      expect(mockJourReglesRepo.save).toHaveBeenCalledWith(existingDay);
    });
  });

  describe('updateCycle (UC-09) & deleteCycle', () => {
    it('devrait mettre à jour un cycle et recalculer sa durée', async () => {
      const cycle = {
        id: 'cycle-1',
        utilisateurId: 'user-1',
        dateDebut: '2026-08-01',
        dateFin: '2026-08-28',
        dureeCycleJours: 28,
        statut: StatutCycleEnum.TERMINE,
      };
      mockCycleRepo.findOne.mockResolvedValue(cycle);

      await service.updateCycle('user-1', 'cycle-1', {
        dateFin: '2026-08-30',
      });

      expect(cycle.dateFin).toBe('2026-08-30');
      expect(cycle.dureeCycleJours).toBe(30);
      expect(mockCycleRepo.save).toHaveBeenCalledWith(cycle);
    });

    it('devrait lancer NotFoundException si cycle inexistant', async () => {
      mockCycleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCycle('user-1', 'inexistant', { dateDebut: '2026-08-01' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait supprimer un cycle et ses jours associés', async () => {
      mockCycleRepo.findOne.mockResolvedValue({ id: 'cycle-to-del', utilisateurId: 'user-1' });

      await service.deleteCycle('user-1', 'cycle-to-del');

      expect(mockJourReglesRepo.delete).toHaveBeenCalledWith({ cycleId: 'cycle-to-del' });
      expect(mockCycleRepo.delete).toHaveBeenCalledWith('cycle-to-del');
    });
  });

  describe('getCycleStats (UC-23)', () => {
    it('devrait calculer des statistiques fiables sur les cycles complétés', async () => {
      const mockCycles = [
        {
          id: 'c1',
          dateDebut: '2026-08-01',
          dateFin: '2026-08-28',
          dureeCycleJours: 28,
          dureeReglesJours: 5,
          statut: StatutCycleEnum.TERMINE,
        },
        {
          id: 'c2',
          dateDebut: '2026-07-04',
          dateFin: '2026-07-31',
          dureeCycleJours: 28,
          dureeReglesJours: 4,
          statut: StatutCycleEnum.TERMINE,
        },
        {
          id: 'c3',
          dateDebut: '2026-06-05',
          dateFin: '2026-07-03',
          dureeCycleJours: 29,
          dureeReglesJours: 5,
          statut: StatutCycleEnum.TERMINE,
        },
      ];
      mockCycleRepo.find.mockResolvedValue(mockCycles);

      const stats = await service.getCycleStats('user-1');

      expect(stats.totalCycles).toBe(3);
      expect(stats.completedCycles).toBe(3);
      expect(stats.averageDuration).toBeCloseTo(28.3, 1);
      expect(stats.minDuration).toBe(28);
      expect(stats.maxDuration).toBe(29);
      expect(stats.regularity).toBe('tres_regulier');
      expect(stats.averagePeriodDuration).toBe(4.7);
    });
  });
});
