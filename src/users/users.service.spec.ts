import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '../../test/test-utils';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { Utilisateur, StatutCompteEnum } from './entities/utilisateur.entity';
import { ProfilUtilisateur, ObjectifEnum } from './entities/profil-utilisateur.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';

describe('UsersService (Module 1 - M1)', () => {
  let service: UsersService;

  const mockUtilisateurRepo = {
    findOne: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };

  const mockProfilRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockSessionRepo = {
    update: jest.fn().mockResolvedValue({ affected: 2 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(Utilisateur), useValue: mockUtilisateurRepo },
        { provide: getRepositoryToken(ProfilUtilisateur), useValue: mockProfilRepo },
        { provide: getRepositoryToken(SessionAuthentification), useValue: mockSessionRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('UC-04 : Consultation et modification de profil', () => {
    it('devrait retourner le profil complet avec paramètres', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        profil: { prenom: 'Awa', objectifPrincipal: ObjectifEnum.SUIVI_CYCLE },
      });

      const result = await service.getProfile('user-1');
      expect(result.id).toBe('user-1');
      expect(result.profil?.prenom).toBe('Awa');
    });

    it('devrait lever NotFoundException si lutilisatrice nexiste pas', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('unknown')).rejects.toThrow(NotFoundException);
    });

    it('devrait mettre à jour les durées de cycle déclarées', async () => {
      mockProfilRepo.findOne.mockResolvedValue({
        utilisateurId: 'user-1',
        dureeCycleHabituelleJours: 28,
      });

      const updated = await service.updateProfile('user-1', {
        dureeCycleHabituelleJours: 31,
        prenom: 'Awa',
      });

      expect(updated.dureeCycleHabituelleJours).toBe(31);
      expect(updated.prenom).toBe('Awa');
    });
  });

  describe('UC-06 : Demande de suppression de compte (Soft Delete)', () => {
    it('devrait passer le compte en statut supprime et revoquer les sessions si mot de passe correct', async () => {
      const hash = await argon2.hash('SecretPassword123');
      const mockUser = {
        id: 'user-1',
        motDePasseHash: hash,
        statutCompte: StatutCompteEnum.ACTIF,
        dateSuppressionDemandee: null,
      };

      mockUtilisateurRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.requestAccountDeletion('user-1', {
        password: 'SecretPassword123',
      });

      expect(result.success).toBe(true);
      expect(mockUser.statutCompte).toBe(StatutCompteEnum.SUPPRIME);
      expect(mockUser.dateSuppressionDemandee).toBeInstanceOf(Date);
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { utilisateurId: 'user-1' },
        { revoque: true },
      );
    });

    it('devrait refuser la suppression si le mot de passe est incorrect (UnauthorizedException)', async () => {
      const hash = await argon2.hash('SecretPassword123');
      mockUtilisateurRepo.findOne.mockResolvedValue({
        id: 'user-1',
        motDePasseHash: hash,
      });

      await expect(
        service.requestAccountDeletion('user-1', { password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
