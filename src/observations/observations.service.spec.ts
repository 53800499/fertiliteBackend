import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '../../test/test-utils';
import { ObservationsService } from './observations.service';
import { TemperatureBasale } from './entities/temperature-basale.entity';
import { GlaireCervicale } from './entities/glaire-cervicale.entity';
import { TestOvulation } from './entities/test-ovulation.entity';
import { TypeSymptome } from './entities/type-symptome.entity';
import { ObservationSymptome } from './entities/observation-symptome.entity';
import {
  TypeGlaireEnum,
  ResultatTestLhEnum,
  CategorieSymptomeEnum,
} from './entities/observation-enums';

describe('ObservationsService (Module 3 - M3)', () => {
  let service: ObservationsService;

  const mockTempRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-temp-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-temp-uuid', ...entity })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockGlaireRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-glaire-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-glaire-uuid', ...entity })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockLhRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-lh-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-lh-uuid', ...entity })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockTypeSymptomeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-type-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-type-uuid', ...entity })),
  };

  const mockObsSymptomeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-obs-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-obs-uuid', ...entity })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObservationsService,
        { provide: getRepositoryToken(TemperatureBasale), useValue: mockTempRepo },
        { provide: getRepositoryToken(GlaireCervicale), useValue: mockGlaireRepo },
        { provide: getRepositoryToken(TestOvulation), useValue: mockLhRepo },
        { provide: getRepositoryToken(TypeSymptome), useValue: mockTypeSymptomeRepo },
        { provide: getRepositoryToken(ObservationSymptome), useValue: mockObsSymptomeRepo },
      ],
    }).compile();

    service = module.get<ObservationsService>(ObservationsService);
  });

  describe('Catalogue des symptômes', () => {
    it('devrait initialiser le catalogue si la table est vide', async () => {
      mockTypeSymptomeRepo.count.mockResolvedValue(0);

      await service.seedSymptomCatalog();

      expect(mockTypeSymptomeRepo.create).toHaveBeenCalled();
      expect(mockTypeSymptomeRepo.save).toHaveBeenCalled();
    });

    it('ne devrait pas réinsérer si des symptômes existent déjà', async () => {
      mockTypeSymptomeRepo.count.mockResolvedValue(11);

      await service.seedSymptomCatalog();

      expect(mockTypeSymptomeRepo.create).not.toHaveBeenCalled();
    });

    it('devrait lister les types de symptômes actifs ordonnés', async () => {
      const mockCatalog = [
        { id: '1', code: 'tension_mammaire', nom: 'Tension mammaire', actif: true },
      ];
      mockTypeSymptomeRepo.find.mockResolvedValue(mockCatalog);

      const result = await service.getSymptomCatalog();
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('tension_mammaire');
    });
  });

  describe('logTemperature (UC-16)', () => {
    it('devrait enregistrer une nouvelle température basale', async () => {
      mockTempRepo.findOne.mockResolvedValue(null);

      const res = await service.logTemperature('user-1', {
        date: '2026-10-01',
        temperatureCelsius: 36.65,
        heurePrise: '07:15',
        estPerturbee: false,
      });

      expect(res.temperatureCelsius).toBe(36.65);
      expect(mockTempRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: 'user-1',
          date: '2026-10-01',
          temperatureCelsius: 36.65,
          estPerturbee: false,
        }),
      );
      expect(mockTempRepo.save).toHaveBeenCalled();
    });

    it('devrait mettre à jour une température déjà existante pour la même date', async () => {
      const existing = {
        id: 'temp-1',
        utilisateurId: 'user-1',
        date: '2026-10-01',
        temperatureCelsius: 36.5,
        estPerturbee: false,
      };
      mockTempRepo.findOne.mockResolvedValue(existing);

      const res = await service.logTemperature('user-1', {
        date: '2026-10-01',
        temperatureCelsius: 36.8,
        estPerturbee: true,
        facteurPerturbateur: 'alcool',
      });

      expect(existing.temperatureCelsius).toBe(36.8);
      expect(existing.estPerturbee).toBe(true);
      expect(mockTempRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('logCervicalMucus (UC-17)', () => {
    it('devrait enregistrer une glaire cervicale de type filant blanc d’oeuf', async () => {
      mockGlaireRepo.findOne.mockResolvedValue(null);

      const res = await service.logCervicalMucus('user-1', {
        date: '2026-10-01',
        typeGlaire: TypeGlaireEnum.FILANT_BLANC_OEUF,
        sensation: 'glissante',
      });

      expect(res.typeGlaire).toBe(TypeGlaireEnum.FILANT_BLANC_OEUF);
      expect(mockGlaireRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: 'user-1',
          date: '2026-10-01',
          typeGlaire: TypeGlaireEnum.FILANT_BLANC_OEUF,
          sensation: 'glissante',
        }),
      );
    });

    it('devrait mettre à jour une glaire existante', async () => {
      const existing = {
        id: 'glaire-1',
        utilisateurId: 'user-1',
        date: '2026-10-01',
        typeGlaire: TypeGlaireEnum.CREMEUX,
      };
      mockGlaireRepo.findOne.mockResolvedValue(existing);

      await service.logCervicalMucus('user-1', {
        date: '2026-10-01',
        typeGlaire: TypeGlaireEnum.FILANT_BLANC_OEUF,
      });

      expect(existing.typeGlaire).toBe(TypeGlaireEnum.FILANT_BLANC_OEUF);
      expect(mockGlaireRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('logLhTest (UC-18)', () => {
    it('devrait enregistrer un test d’ovulation positif', async () => {
      const res = await service.logLhTest('user-1', {
        date: '2026-10-01',
        heureTest: '14:30',
        resultat: ResultatTestLhEnum.PIC,
        valeurMUiMl: 45.5,
      });

      expect(res.resultat).toBe(ResultatTestLhEnum.PIC);
      expect(mockLhRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: 'user-1',
          resultat: ResultatTestLhEnum.PIC,
          valeurMUiMl: 45.5,
        }),
      );
      expect(mockLhRepo.save).toHaveBeenCalled();
    });
  });

  describe('logSymptoms (UC-19)', () => {
    it('devrait lever une erreur si le code de symptôme est inconnu', async () => {
      mockTypeSymptomeRepo.find.mockResolvedValue([]);

      await expect(
        service.logSymptoms('user-1', {
          date: '2026-10-01',
          symptomes: [{ code: 'code_inexistant', intensite: 3 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait enregistrer les symptômes avec leur intensité', async () => {
      mockTypeSymptomeRepo.find.mockResolvedValue([
        { id: 'sym-uuid-1', code: 'crampes_pelviennes', nom: 'Crampes' },
      ]);
      mockObsSymptomeRepo.findOne.mockResolvedValue(null);

      const res = await service.logSymptoms('user-1', {
        date: '2026-10-01',
        symptomes: [{ code: 'crampes_pelviennes', intensite: 4, notes: 'Bas ventre' }],
      });

      expect(res).toHaveLength(1);
      expect(mockObsSymptomeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          utilisateurId: 'user-1',
          date: '2026-10-01',
          typeSymptomeId: 'sym-uuid-1',
          intensite: 4,
          notes: 'Bas ventre',
        }),
      );
    });
  });

  describe('getDayObservations (UC-12)', () => {
    it('devrait agréger les observations du jour', async () => {
      mockTempRepo.findOne.mockResolvedValue({
        id: 't-1',
        date: '2026-10-01',
        temperatureCelsius: 36.7,
      });
      mockGlaireRepo.findOne.mockResolvedValue({
        id: 'g-1',
        date: '2026-10-01',
        typeGlaire: TypeGlaireEnum.FILANT_BLANC_OEUF,
      });
      mockLhRepo.find.mockResolvedValue([
        { id: 'lh-1', date: '2026-10-01', resultat: ResultatTestLhEnum.POSITIF },
      ]);
      mockObsSymptomeRepo.find.mockResolvedValue([
        { id: 'obs-1', date: '2026-10-01', intensite: 3, typeSymptome: { nom: 'Fatigue' } },
      ]);

      const detail = await service.getDayObservations('user-1', '2026-10-01');

      expect(detail.date).toBe('2026-10-01');
      expect(detail.temperature?.temperatureCelsius).toBe(36.7);
      expect(detail.glaire?.typeGlaire).toBe(TypeGlaireEnum.FILANT_BLANC_OEUF);
      expect(detail.testsLh).toHaveLength(1);
      expect(detail.symptomes).toHaveLength(1);
    });
  });

  describe('Suppressions unitaires', () => {
    it('devrait supprimer une température', async () => {
      await service.deleteTemperature('user-1', '2026-10-01');
      expect(mockTempRepo.delete).toHaveBeenCalledWith({
        utilisateurId: 'user-1',
        date: '2026-10-01',
      });
    });

    it('devrait supprimer une glaire', async () => {
      await service.deleteCervicalMucus('user-1', '2026-10-01');
      expect(mockGlaireRepo.delete).toHaveBeenCalledWith({
        utilisateurId: 'user-1',
        date: '2026-10-01',
      });
    });

    it('devrait supprimer un test LH', async () => {
      mockLhRepo.findOne.mockResolvedValue({ id: 'lh-1', utilisateurId: 'user-1' });
      await service.deleteLhTest('user-1', 'lh-1');
      expect(mockLhRepo.delete).toHaveBeenCalledWith('lh-1');
    });

    it('devrait supprimer un symptôme', async () => {
      mockObsSymptomeRepo.findOne.mockResolvedValue({ id: 'obs-1', utilisateurId: 'user-1' });
      await service.deleteSymptom('user-1', 'obs-1');
      expect(mockObsSymptomeRepo.delete).toHaveBeenCalledWith('obs-1');
    });
  });
});
