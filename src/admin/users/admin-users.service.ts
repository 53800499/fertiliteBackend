import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StatutCompteEnum,
  Utilisateur,
} from '../../users/entities/utilisateur.entity';
import { SessionAuthentification } from '../../auth/entities/session-authentification.entity';
import { Abonnement } from '../../subscriptions/entities/abonnement.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly userRepo: Repository<Utilisateur>,
    @InjectRepository(SessionAuthentification)
    private readonly sessionRepo: Repository<SessionAuthentification>,
    @InjectRepository(Abonnement)
    private readonly abonnementRepo: Repository<Abonnement>,
    @InjectRepository(Consentement)
    private readonly consentRepo: Repository<Consentement>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async listUsers(search?: string, status?: string) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.profil', 'p')
      .select([
        'u.id',
        'u.email',
        'u.statutCompte',
        'u.role',
        'u.languePreferee',
        'u.fuseauHoraire',
        'u.dateCreation',
        'u.dateDerniereConnexion',
        'u.dateSuppressionDemandee',
        'p.prenom',
      ])
      .orderBy('u.dateCreation', 'DESC')
      .take(200);

    if (search && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(u.email) LIKE :term OR LOWER(COALESCE(p.prenom, '')) LIKE :term)",
        { term },
      );
    }
    if (status && status !== 'tous') {
      qb.andWhere('u.statutCompte = :status', { status });
    }

    const users = await qb.getMany();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      prenom: u.profil?.prenom || null,
      statutCompte: u.statutCompte,
      role: u.role,
      languePreferee: u.languePreferee,
      fuseauHoraire: u.fuseauHoraire,
      dateCreation: u.dateCreation,
      dateDerniereConnexion: u.dateDerniereConnexion,
      dateSuppressionDemandee: u.dateSuppressionDemandee,
    }));
  }

  async getUserAdministrativeDetails(userId: string, actor: AdminActor) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { profil: true },
    });
    if (!user) throw new NotFoundException('Utilisatrice introuvable.');

    const [sessions, subscriptions, consents] = await Promise.all([
      this.sessionRepo.find({
        where: { utilisateurId: userId },
        order: { dateDerniereUtilisation: 'DESC' },
        take: 15,
      }),
      this.abonnementRepo.find({
        where: { utilisateurId: userId },
        order: { dateCreation: 'DESC' },
        take: 15,
      }),
      this.consentRepo.find({
        where: { utilisateurId: userId },
        order: { dateConsentement: 'DESC' },
        take: 20,
      }),
    ]);

    await this.auditLogger.log(actor, 'users', 'VIEW_ADMIN_PROFILE', 'utilisateur', userId, {
      medicalDataExcluded: true,
    });

    return {
      compte: {
        id: user.id,
        email: user.email,
        prenom: user.profil?.prenom || null,
        statutCompte: user.statutCompte,
        role: user.role,
        emailVerifie: user.emailVerifie,
        languePreferee: user.languePreferee,
        fuseauHoraire: user.fuseauHoraire,
        dateCreation: user.dateCreation,
        dateDerniereConnexion: user.dateDerniereConnexion,
        dateSuppressionDemandee: user.dateSuppressionDemandee,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        plateforme: s.plateforme,
        revoque: s.revoque,
        dateCreation: s.dateDerniereUtilisation,
        dateExpiration: s.dateExpiration,
      })),
      abonnements: subscriptions,
      consentements: consents,
      noteConfidentialite:
        'Les données médicales sensibles (cycles, températures, symptômes, grossesse) sont isolées et inaccessibles depuis la vue administrative.',
    };
  }

  async updateUserStatus(
    userId: string,
    statutCompte: StatutCompteEnum,
    actor: AdminActor,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisatrice introuvable.');

    const previous = user.statutCompte;
    user.statutCompte = statutCompte;
    if (statutCompte === StatutCompteEnum.SUPPRIME && !user.dateSuppressionDemandee) {
      user.dateSuppressionDemandee = new Date();
    }
    await this.userRepo.save(user);

    if (statutCompte !== StatutCompteEnum.ACTIF) {
      await this.sessionRepo.update({ utilisateurId: userId }, { revoque: true });
    }

    await this.auditLogger.log(actor, 'users', 'UPDATE_ACCOUNT_STATUS', 'utilisateur', userId, {
      previous,
      next: statutCompte,
    });

    return { id: user.id, statutCompte: user.statutCompte };
  }

  async revokeUserSessions(userId: string, actor: AdminActor) {
    await this.sessionRepo.update({ utilisateurId: userId }, { revoque: true });
    await this.auditLogger.log(actor, 'security', 'REVOKE_USER_SESSIONS', 'utilisateur', userId);
    return { success: true, message: 'Toutes les sessions actives ont été révoquées.' };
  }
}

