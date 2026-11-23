import {
  Injectable,
  Optional,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Utilisateur, StatutCompteEnum } from '../users/entities/utilisateur.entity';
import { ProfilUtilisateur, ObjectifEnum } from '../users/entities/profil-utilisateur.entity';
import { ParametreConfidentialite } from '../privacy/entities/parametre-confidentialite.entity';
import { Consentement, TypeConsentementEnum } from '../privacy/entities/consentement.entity';
import { SessionAuthentification, PlateformeEnum } from './entities/session-authentification.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/password-reset.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(ProfilUtilisateur)
    private readonly profilRepo: Repository<ProfilUtilisateur>,
    @InjectRepository(ParametreConfidentialite)
    private readonly parametresRepo: Repository<ParametreConfidentialite>,
    @InjectRepository(Consentement)
    private readonly consentementRepo: Repository<Consentement>,
    @InjectRepository(SessionAuthentification)
    private readonly sessionRepo: Repository<SessionAuthentification>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  /**
   * UC-01 : Création d'un compte avec profil initial, paramètres et consentements
   */
  async register(dto: RegisterDto, clientIp?: string) {
    // 1. Vérification unicité email
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.utilisateurRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Cette adresse email est déjà associée à un compte.');
    }

    // 2. Vérification de l'âge minimum (16 ans)
    const birthDate = new Date(dto.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 16) {
      throw new BadRequestException("L'âge minimum requis pour utiliser le service est de 16 ans.");
    }

    // 3. Vérification des consentements obligatoires (CGU et Politique de confidentialité)
    const hasCgu = dto.consents.some(
      (c) => c.type === TypeConsentementEnum.CGU && c.accepted,
    );
    const hasPrivacy = dto.consents.some(
      (c) => c.type === TypeConsentementEnum.POLITIQUE_CONFIDENTIALITE && c.accepted,
    );
    if (!hasCgu || !hasPrivacy) {
      throw new BadRequestException(
        "L'acceptation des CGU et de la politique de confidentialité est obligatoire.",
      );
    }

    // 3b. Validation préalable du code de parrainage éventuel (utilisable uniquement à la création du compte)
    const normalizedReferralCode = dto.referralCode?.trim();
    if (normalizedReferralCode && this.subscriptionsService) {
      await this.subscriptionsService.validateReferralCodeForRegistration(
        normalizedReferralCode,
      );
    }

    // 4. Hachage du mot de passe avec Argon2id
    const motDePasseHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 5. Création de l'utilisatrice
    const user = this.utilisateurRepo.create({
      email: normalizedEmail,
      motDePasseHash,
      dateNaissance: dto.birthDate,
      languePreferee: dto.preferredLanguage || 'fr',
      fuseauHoraire: dto.timezone || 'Africa/Porto-Novo',
      statutCompte: StatutCompteEnum.ACTIF,
    });
    const savedUser = await this.utilisateurRepo.save(user);

    // 6. Création du profil initial par défaut
    const userDisplayName = dto.prenom?.trim() || dto.nom?.trim() || null;
    const profil = this.profilRepo.create({
      utilisateurId: savedUser.id,
      prenom: userDisplayName,
      objectifPrincipal: ObjectifEnum.SUIVI_CYCLE,
      dureeCycleHabituelleJours: 28,
      dureeReglesHabituelleJours: 5,
      irregulariteDeclaree: false,
    });
    await this.profilRepo.save(profil);

    // 7. Création des paramètres de confidentialité
    const optInResearch = dto.consents.find(
      (c) => c.type === TypeConsentementEnum.PARTAGE_DONNEES_ANONYMISEES,
    )?.accepted ?? false;

    const params = this.parametresRepo.create({
      utilisateurId: savedUser.id,
      partageDonneesRecherche: optInResearch,
      notificationsActivees: true,
      verrouillageBiometrique: false,
      masquageDonneesSensibles: false,
    });
    await this.parametresRepo.save(params);

    // 8. Enregistrement horodaté des consentements
    for (const consentDto of dto.consents) {
      const consent = this.consentementRepo.create({
        utilisateurId: savedUser.id,
        typeConsentement: consentDto.type,
        versionDocument: consentDto.version,
        accepte: consentDto.accepted,
        adresseIpConsentement: clientIp,
      });
      await this.consentementRepo.save(consent);
    }

    // 8b. Application du code de parrainage éventuel (bonus +30 jours marraine & filleule)
    let referralApplied = false;
    if (normalizedReferralCode && this.subscriptionsService) {
      await this.subscriptionsService.applyReferralCodeOnRegistration(
        savedUser.id,
        normalizedReferralCode,
      );
      referralApplied = true;
    }

    // 9. Émission des tokens et création de session
    const tokens = await this.generateTokens(savedUser.id, savedUser.email);
    await this.createOrUpdateSession(savedUser.id, tokens.refreshToken, 'Premier appareil', PlateformeEnum.WEB, clientIp);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        emailVerified: savedUser.emailVerifie,
      },
      tokens,
      referralApplied,
    };
  }

  /**
   * UC-02 : Connexion utilisateur
   */
  async login(dto: LoginDto, clientIp?: string) {
    const user = await this.utilisateurRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || user.statutCompte === StatutCompteEnum.SUPPRIME) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.statutCompte === StatutCompteEnum.SUSPENDU) {
      throw new UnauthorizedException('Ce compte est suspendu');
    }

    const isPasswordValid = await argon2.verify(user.motDePasseHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Mise à jour de la dernière connexion
    user.dateDerniereConnexion = new Date();
    await this.utilisateurRepo.save(user);

    // Génération de tokens et mise à jour de la session sans dupliquer l'appareil
    const tokens = await this.generateTokens(user.id, user.email);
    await this.createOrUpdateSession(
      user.id,
      tokens.refreshToken,
      dto.deviceName || 'Appareil mobile',
      dto.platform || PlateformeEnum.ANDROID,
      clientIp,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerifie,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Rafraîchissement de token JWT
   */
  async refreshToken(dto: RefreshTokenDto, clientIp?: string) {
    const hashed = this.hashToken(dto.refreshToken);

    const session = await this.sessionRepo.findOne({
      where: { jetonRafraichissementHash: hashed },
      relations: { utilisateur: true },
    });

    if (!session || (session.dateExpiration && new Date() > session.dateExpiration)) {
      throw new UnauthorizedException('Session expirée ou invalide. Veuillez vous reconnecter.');
    }

    const user = session.utilisateur;
    if (!user || user.statutCompte !== StatutCompteEnum.ACTIF) {
      throw new UnauthorizedException('Utilisatrice inactive');
    }

    session.revoque = false;

    // Rotation du Refresh Token
    const tokens = await this.generateTokens(user.id, user.email);

    session.jetonRafraichissementHash = this.hashToken(tokens.refreshToken);
    session.dateDerniereUtilisation = new Date();
    session.dateExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (clientIp) session.adresseIp = clientIp;
    await this.sessionRepo.save(session);

    return tokens;
  }

  /**
   * Déconnexion (révocation de la session courante)
   */
  async logout(userId?: string, currentRefreshToken?: string) {
    try {
      if (currentRefreshToken) {
        const hashed = this.hashToken(currentRefreshToken);
        await this.sessionRepo.update(
          { jetonRafraichissementHash: hashed },
          { revoque: true },
        );
      } else if (userId) {
        await this.sessionRepo.update(
          { utilisateurId: userId, revoque: false },
          { revoque: true },
        );
      }
    } catch (_) {}
    return { success: true, message: 'Déconnexion réussie' };
  }

  /**
   * UC-03 : Mot de passe oublié (sécurisé, génération d'un code de vérification à 6 chiffres)
   */
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.utilisateurRepo.findOne({ where: { email: normalizedEmail } });

    if (user && user.statutCompte === StatutCompteEnum.ACTIF) {
      // Code à 6 chiffres (valable 15 minutes)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiration = new Date(Date.now() + 15 * 60 * 1000);

      user.codeReinitialisation = code;
      user.expirationReinitialisation = expiration;
      await this.utilisateurRepo.save(user);

      this.logger.log(`[AUTH] Code de réinitialisation généré pour ${normalizedEmail}: ${code}`);

      const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
      return {
        success: true,
        message: 'Un code de confirmation à 6 chiffres vous a été envoyé.',
        code: isDev ? code : undefined,
      };
    }

    return {
      success: true,
      message: 'Si cette adresse email existe, un code de confirmation vous a été envoyé.',
    };
  }

  /**
   * UC-03b : Réinitialisation effective du mot de passe avec validation du code
   */
  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const code = (dto.code || dto.resetToken)?.trim();

    if (!code) {
      throw new BadRequestException('Le code de vérification est obligatoire.');
    }

    const user = await this.utilisateurRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new BadRequestException('Demande de réinitialisation invalide ou code expiré.');
    }

    if (!user.codeReinitialisation || user.codeReinitialisation !== code) {
      throw new BadRequestException('Code de confirmation invalide. Veuillez vérifier le code saisi.');
    }

    if (!user.expirationReinitialisation || new Date() > user.expirationReinitialisation) {
      throw new BadRequestException('Le code de confirmation a expiré. Veuillez en demander un nouveau.');
    }

    // Hachage du nouveau mot de passe avec Argon2id
    const nouveauHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    user.motDePasseHash = nouveauHash;
    user.codeReinitialisation = null;
    user.expirationReinitialisation = null;
    await this.utilisateurRepo.save(user);

    // Révocation de toutes les sessions actives pour sécuriser le compte
    await this.sessionRepo.update(
      { utilisateurId: user.id, revoque: false },
      { revoque: true },
    );

    this.logger.log(`[AUTH] Mot de passe réinitialisé avec succès pour l'utilisatrice ${normalizedEmail}`);

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  /**
   * Helpers
   */
  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '30d',
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresIn: 30 * 24 * 3600, // 30 jours en secondes
    };
  }

  private async createOrUpdateSession(
    userId: string,
    rawRefreshToken: string,
    nomAppareil: string,
    plateforme: PlateformeEnum,
    ip?: string,
  ) {
    const hashedToken = this.hashToken(rawRefreshToken);
    const expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    const normalizedDeviceName = (nomAppareil || 'Appareil mobile').trim();

    // 1. Rechercher si une session existe déjà pour cet appareil (même utilisatrice, même nom d'appareil et plateforme)
    const existingSession = await this.sessionRepo.findOne({
      where: {
        utilisateurId: userId,
        nomAppareil: normalizedDeviceName,
        plateforme: plateforme,
      },
      order: { dateDerniereUtilisation: 'DESC' },
    });

    if (existingSession) {
      // Éviter de dupliquer l'appareil : on réutilise la même ligne en BDD
      // datePremiereConnexion est préservée pour connaître le début de la période
      existingSession.jetonRafraichissementHash = hashedToken;
      existingSession.dateExpiration = expiration;
      existingSession.dateDerniereUtilisation = new Date();
      existingSession.revoque = false;
      if (ip) existingSession.adresseIp = ip;

      // Nettoyer d'éventuels doublons orphelins résiduels
      await this.sessionRepo
        .createQueryBuilder()
        .update(SessionAuthentification)
        .set({ revoque: true })
        .where('utilisateur_id = :userId', { userId })
        .andWhere('nom_appareil = :nomAppareil', { nomAppareil: normalizedDeviceName })
        .andWhere('plateforme = :plateforme', { plateforme })
        .andWhere('id != :keepId', { keepId: existingSession.id })
        .execute()
        .catch(() => {});

      return this.sessionRepo.save(existingSession);
    }

    // 2. Si c'est un nouvel appareil, on l'insère une seule fois
    const newSession = this.sessionRepo.create({
      utilisateurId: userId,
      jetonRafraichissementHash: hashedToken,
      nomAppareil: normalizedDeviceName,
      plateforme,
      adresseIp: ip,
      datePremiereConnexion: new Date(),
      dateDerniereUtilisation: new Date(),
      dateExpiration: expiration,
      revoque: false,
    });
    return this.sessionRepo.save(newSession);
  }

  decodeToken(token: string): { sub?: string; email?: string } | null {
    try {
      return this.jwtService.decode(token) as { sub?: string; email?: string } | null;
    } catch (_) {
      return null;
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
