import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
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

@Injectable()
export class AuthService {
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
  ) {}

  /**
   * UC-01 : Création d'un compte avec profil initial, paramètres et consentements
   */
  async register(dto: RegisterDto, clientIp?: string) {
    // 1. Vérification unicité email
    const existing = await this.utilisateurRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Cette adresse email est déjà associée à un compte.');
    }

    // 2. Vérification de l'âge minimum (12 ans)
    const birthDate = new Date(dto.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 12) {
      throw new BadRequestException("L'âge minimum requis pour utiliser le service est de 12 ans.");
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

    // 4. Hachage du mot de passe avec Argon2id
    const motDePasseHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 5. Création de l'utilisatrice
    const user = this.utilisateurRepo.create({
      email: dto.email.toLowerCase(),
      motDePasseHash,
      dateNaissance: dto.birthDate,
      languePreferee: dto.preferredLanguage || 'fr',
      fuseauHoraire: dto.timezone || 'Africa/Porto-Novo',
      statutCompte: StatutCompteEnum.ACTIF,
    });
    const savedUser = await this.utilisateurRepo.save(user);

    // 6. Création du profil initial par défaut
    const profil = this.profilRepo.create({
      utilisateurId: savedUser.id,
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

    // 9. Émission des tokens et création de session
    const tokens = await this.generateTokens(savedUser.id, savedUser.email);
    await this.createSession(savedUser.id, tokens.refreshToken, 'Premier appareil', PlateformeEnum.WEB, clientIp);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        emailVerified: savedUser.emailVerifie,
      },
      tokens,
    };
  }

  /**
   * UC-02 : Connexion utilisateur
   */
  async login(dto: LoginDto, clientIp?: string) {
    const user = await this.utilisateurRepo.findOne({
      where: { email: dto.email.toLowerCase() },
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

    // Génération de tokens et nouvelle session
    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(
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
      where: { jetonRafraichissementHash: hashed, revoque: false },
      relations: { utilisateur: true },
    });

    if (!session || new Date() > session.dateExpiration) {
      throw new UnauthorizedException('Session expirée ou invalide. Veuillez vous reconnecter.');
    }

    const user = session.utilisateur;
    if (!user || user.statutCompte !== StatutCompteEnum.ACTIF) {
      throw new UnauthorizedException('Utilisatrice inactive');
    }

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
  async logout(userId: string, currentRefreshToken?: string) {
    if (currentRefreshToken) {
      const hashed = this.hashToken(currentRefreshToken);
      await this.sessionRepo.update(
        { utilisateurId: userId, jetonRafraichissementHash: hashed },
        { revoque: true },
      );
    } else {
      await this.sessionRepo.update(
        { utilisateurId: userId, revoque: false },
        { revoque: true },
      );
    }
    return { success: true, message: 'Déconnexion réussie' };
  }

  /**
   * UC-03 : Mot de passe oublié (sécurisé, ne divulgue pas l'existence de l'email)
   */
  async forgotPassword(email: string) {
    const user = await this.utilisateurRepo.findOne({ where: { email: email.toLowerCase() } });
    if (user && user.statutCompte === StatutCompteEnum.ACTIF) {
      // Dans une implémentation complète, génération de jeton de reset et envoi par email
    }
    return {
      success: true,
      message: 'Si cette adresse email existe, un lien de réinitialisation vous a été envoyé.',
    };
  }

  /**
   * Helpers
   */
  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min en secondes
    };
  }

  private async createSession(
    userId: string,
    rawRefreshToken: string,
    nomAppareil: string,
    plateforme: PlateformeEnum,
    ip?: string,
  ) {
    const session = this.sessionRepo.create({
      utilisateurId: userId,
      jetonRafraichissementHash: this.hashToken(rawRefreshToken),
      nomAppareil,
      plateforme,
      adresseIp: ip,
      dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      revoque: false,
    });
    return this.sessionRepo.save(session);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
