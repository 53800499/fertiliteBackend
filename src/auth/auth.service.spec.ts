import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '../../test/test-utils';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { Utilisateur, StatutCompteEnum } from '../users/entities/utilisateur.entity';
import { ProfilUtilisateur, ObjectifEnum } from '../users/entities/profil-utilisateur.entity';
import { ParametreConfidentialite } from '../privacy/entities/parametre-confidentialite.entity';
import { Consentement, TypeConsentementEnum } from '../privacy/entities/consentement.entity';
import { SessionAuthentification, PlateformeEnum } from './entities/session-authentification.entity';

describe('AuthService (Module 1 - M1)', () => {
  let service: AuthService;

  const mockUtilisateurRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ id: 'mock-user-uuid', ...dto })),
    save: jest.fn((entity) => Promise.resolve({ id: 'mock-user-uuid', ...entity })),
  };

  const mockProfilRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockParametresRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockConsentementRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockSessionRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Utilisateur), useValue: mockUtilisateurRepo },
        { provide: getRepositoryToken(ProfilUtilisateur), useValue: mockProfilRepo },
        { provide: getRepositoryToken(ParametreConfidentialite), useValue: mockParametresRepo },
        { provide: getRepositoryToken(Consentement), useValue: mockConsentementRepo },
        { provide: getRepositoryToken(SessionAuthentification), useValue: mockSessionRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('UC-01 : Création de compte (register)', () => {
    const validRegisterDto = {
      email: 'awa@example.com',
      password: 'Password123!',
      birthDate: '1998-05-14',
      consents: [
        { type: TypeConsentementEnum.CGU, version: '1.0', accepted: true },
        { type: TypeConsentementEnum.POLITIQUE_CONFIDENTIALITE, version: '1.0', accepted: true },
      ],
    };

    it('devrait créer une utilisatrice, son profil, ses paramètres et retourner des jetons valides', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue(null);

      const result = await service.register(validRegisterDto);

      expect(mockUtilisateurRepo.findOne).toHaveBeenCalledWith({ where: { email: 'awa@example.com' } });
      expect(mockUtilisateurRepo.save).toHaveBeenCalled();
      expect(mockProfilRepo.save).toHaveBeenCalled();
      expect(mockParametresRepo.save).toHaveBeenCalled();
      expect(mockConsentementRepo.save).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
    });

    it('devrait rejeter linscription si lemail est déjà utilisé (ConflictException)', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue({ id: 'existing-id', email: 'awa@example.com' });

      await expect(service.register(validRegisterDto)).rejects.toThrow(ConflictException);
    });

    it('devrait rejeter linscription si lâge déclaré est inférieur à 12 ans', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue(null);
      const underAgeDto = {
        ...validRegisterDto,
        birthDate: '2020-01-01', // Moins de 12 ans
      };

      await expect(service.register(underAgeDto)).rejects.toThrow(BadRequestException);
    });

    it('devrait rejeter linscription si les CGU ou la Politique ne sont pas acceptées', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue(null);
      const missingConsentDto = {
        ...validRegisterDto,
        consents: [
          { type: TypeConsentementEnum.CGU, version: '1.0', accepted: false },
        ],
      };

      await expect(service.register(missingConsentDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('UC-02 : Connexion (login)', () => {
    it('devrait connecter lutilisatrice et émettre des tokens en cas didentifiants valides', async () => {
      const hash = await argon2.hash('Password123!');
      const mockUser = {
        id: 'user-id-1',
        email: 'awa@example.com',
        motDePasseHash: hash,
        statutCompte: StatutCompteEnum.ACTIF,
        emailVerifie: true,
      };

      mockUtilisateurRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'awa@example.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBe('user-id-1');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });

    it('devrait rejeter la connexion si le mot de passe est erroné (UnauthorizedException)', async () => {
      const hash = await argon2.hash('CorrectPassword');
      mockUtilisateurRepo.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: 'awa@example.com',
        motDePasseHash: hash,
        statutCompte: StatutCompteEnum.ACTIF,
      });

      await expect(
        service.login({ email: 'awa@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devrait rejeter la connexion si le compte a été supprimé (soft delete)', async () => {
      mockUtilisateurRepo.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: 'awa@example.com',
        statutCompte: StatutCompteEnum.SUPPRIME,
      });

      await expect(
        service.login({ email: 'awa@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
