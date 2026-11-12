import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import {
  RoleUtilisateurEnum,
  StatutCompteEnum,
  Utilisateur,
} from '../../users/entities/utilisateur.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { AdminAuditLog } from '../../super-admin/entities/admin-audit-log.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminSecurityService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly userRepo: Repository<Utilisateur>,
    @InjectRepository(Consentement)
    private readonly consentRepo: Repository<Consentement>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async listAdmins() {
    const admins = await this.userRepo.find({
      where: [
        { role: RoleUtilisateurEnum.SUPER_ADMIN },
        { role: RoleUtilisateurEnum.ADMIN },
      ],
      order: { dateCreation: 'DESC' },
    });
    return admins.map((a) => ({
      id: a.id,
      email: a.email,
      role: a.role,
      statutCompte: a.statutCompte,
      dateCreation: a.dateCreation,
      dateDerniereConnexion: a.dateDerniereConnexion,
    }));
  }

  async createOrPromoteAdmin(
    dto: { email: string; password?: string; role: RoleUtilisateurEnum },
    actor: AdminActor,
  ) {
    if (!dto.email?.trim()) throw new BadRequestException('Email requis.');
    const email = dto.email.trim().toLowerCase();
    let user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      user.role = dto.role || RoleUtilisateurEnum.ADMIN;
      await this.userRepo.save(user);
    } else {
      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException(
          'Mot de passe (min 8 caractères) requis pour un nouvel administrateur.',
        );
      }
      const hash = await argon2.hash(dto.password, { type: argon2.argon2id });
      user = this.userRepo.create({
        email,
        motDePasseHash: hash,
        dateNaissance: '1990-01-01',
        role: dto.role || RoleUtilisateurEnum.ADMIN,
        statutCompte: StatutCompteEnum.ACTIF,
        emailVerifie: true,
      });
      user = await this.userRepo.save(user);
    }

    await this.auditLogger.log(actor, 'security', 'UPSERT_ADMIN_ROLE', 'utilisateur', user.id, {
      email: user.email,
      role: user.role,
    });
    return { id: user.id, email: user.email, role: user.role, statutCompte: user.statutCompte };
  }

  getAuditLogs(moduleFilter?: string) {
    const where = moduleFilter && moduleFilter !== 'tous' ? { module: moduleFilter } : {};
    return this.auditRepo.find({
      where,
      order: { dateCreation: 'DESC' },
      take: 200,
    });
  }

  async getConsentGovernance() {
    const [recentConsents, deletionRequests] = await Promise.all([
      this.consentRepo.find({ order: { dateConsentement: 'DESC' }, take: 50 }),
      this.userRepo
        .createQueryBuilder('u')
        .select([
          'u.id',
          'u.email',
          'u.statutCompte',
          'u.dateSuppressionDemandee',
          'u.dateCreation',
        ])
        .where('u.dateSuppressionDemandee IS NOT NULL')
        .orderBy('u.dateSuppressionDemandee', 'DESC')
        .getMany(),
    ]);

    return {
      recentConsents,
      deletionRequests,
    };
  }
}

