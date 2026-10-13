import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParametreConfidentialite } from './entities/parametre-confidentialite.entity';
import { Consentement } from './entities/consentement.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateConsentDto } from './dto/create-consent.dto';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(ParametreConfidentialite)
    private readonly parametresRepo: Repository<ParametreConfidentialite>,
    @InjectRepository(Consentement)
    private readonly consentementRepo: Repository<Consentement>,
    @InjectRepository(SessionAuthentification)
    private readonly sessionRepo: Repository<SessionAuthentification>,
  ) {}

  /**
   * Consultation des paramètres de confidentialité actifs
   */
  async getSettings(userId: string) {
    let settings = await this.parametresRepo.findOne({
      where: { utilisateurId: userId },
    });

    if (!settings) {
      settings = this.parametresRepo.create({ utilisateurId: userId });
      await this.parametresRepo.save(settings);
    }

    return settings;
  }

  /**
   * Modification des paramètres de confidentialité
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.getSettings(userId);

    if (dto.partageDonneesRecherche !== undefined) {
      settings.partageDonneesRecherche = dto.partageDonneesRecherche;
    }
    if (dto.notificationsActivees !== undefined) {
      settings.notificationsActivees = dto.notificationsActivees;
    }
    if (dto.verrouillageBiometrique !== undefined) {
      settings.verrouillageBiometrique = dto.verrouillageBiometrique;
    }
    if (dto.masquageDonneesSensibles !== undefined) {
      settings.masquageDonneesSensibles = dto.masquageDonneesSensibles;
    }

    return this.parametresRepo.save(settings);
  }

  /**
   * Historique des consentements opposables
   */
  async getConsents(userId: string) {
    return this.consentementRepo.find({
      where: { utilisateurId: userId },
      order: { dateConsentement: 'DESC' },
    });
  }

  /**
   * Enregistrement d'un nouvel accord ou d'un retrait
   */
  async recordConsent(userId: string, dto: CreateConsentDto, ip?: string) {
    const consent = this.consentementRepo.create({
      utilisateurId: userId,
      typeConsentement: dto.typeConsentement,
      versionDocument: dto.versionDocument,
      accepte: dto.accepte,
      adresseIpConsentement: ip,
      dateRetrait: dto.accepte ? null : new Date(),
    });

    return this.consentementRepo.save(consent);
  }

  /**
   * Liste des sessions actives par appareil
   */
  async getActiveSessions(userId: string) {
    return this.sessionRepo.find({
      where: { utilisateurId: userId, revoque: false },
      select: {
        id: true,
        nomAppareil: true,
        plateforme: true,
        adresseIp: true,
        dateExpiration: true,
        dateDerniereUtilisation: true,
      },
      order: { dateDerniereUtilisation: 'DESC' },
    });
  }

  /**
   * Révocation d'une session à distance
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, utilisateurId: userId },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable');
    }

    session.revoque = true;
    await this.sessionRepo.save(session);

    return { success: true, message: 'Session révoquée avec succès' };
  }
}
