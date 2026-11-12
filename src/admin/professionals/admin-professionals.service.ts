import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HealthcareProfessional,
  StatutValidationProEnum,
} from '../../super-admin/entities/healthcare-professional.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminProfessionalsService {
  constructor(
    @InjectRepository(HealthcareProfessional)
    private readonly proRepo: Repository<HealthcareProfessional>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async listProfessionals(status?: string) {
    const where = status && status !== 'tous' ? { statutValidation: status } : {};
    return this.proRepo.find({ where, order: { dateCreation: 'DESC' } });
  }

  async createProfessional(dto: Partial<HealthcareProfessional>, actor: AdminActor) {
    if (!dto.nomComplet?.trim()) {
      throw new BadRequestException('Le nom complet du professionnel est requis.');
    }
    const pro = this.proRepo.create({
      nomComplet: dto.nomComplet.trim(),
      specialite: dto.specialite || 'gynecologue',
      etablissement: dto.etablissement || null,
      commune: dto.commune || 'Cotonou',
      departement: dto.departement || 'Littoral',
      telephone: dto.telephone || null,
      email: dto.email || null,
      numeroOrdre: dto.numeroOrdre || null,
      statutValidation: dto.statutValidation || StatutValidationProEnum.EN_ATTENTE,
      diplomeVerifie: Boolean(dto.diplomeVerifie),
      disponibilites: dto.disponibilites || 'Lun - Ven, 09h - 17h',
    });
    const saved = await this.proRepo.save(pro);
    await this.auditLogger.log(
      actor,
      'professionals',
      'CREATE_PROFESSIONAL',
      'professionnel',
      saved.id,
      { nomComplet: saved.nomComplet, specialite: saved.specialite },
    );
    return saved;
  }

  async updateProfessional(
    id: string,
    dto: Partial<HealthcareProfessional>,
    actor: AdminActor,
  ) {
    const pro = await this.proRepo.findOne({ where: { id } });
    if (!pro) throw new NotFoundException('Professionnel introuvable.');
    Object.assign(pro, {
      ...(dto.nomComplet !== undefined && { nomComplet: dto.nomComplet }),
      ...(dto.specialite !== undefined && { specialite: dto.specialite }),
      ...(dto.etablissement !== undefined && { etablissement: dto.etablissement }),
      ...(dto.commune !== undefined && { commune: dto.commune }),
      ...(dto.departement !== undefined && { departement: dto.departement }),
      ...(dto.telephone !== undefined && { telephone: dto.telephone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.numeroOrdre !== undefined && { numeroOrdre: dto.numeroOrdre }),
      ...(dto.statutValidation !== undefined && { statutValidation: dto.statutValidation }),
      ...(dto.diplomeVerifie !== undefined && { diplomeVerifie: dto.diplomeVerifie }),
      ...(dto.disponibilites !== undefined && { disponibilites: dto.disponibilites }),
    });
    const saved = await this.proRepo.save(pro);
    await this.auditLogger.log(
      actor,
      'professionals',
      'UPDATE_PROFESSIONAL',
      'professionnel',
      id,
      { statutValidation: saved.statutValidation, diplomeVerifie: saved.diplomeVerifie },
    );
    return saved;
  }

  async deleteProfessional(id: string, actor: AdminActor) {
    await this.proRepo.delete(id);
    await this.auditLogger.log(actor, 'professionals', 'DELETE_PROFESSIONAL', 'professionnel', id);
    return { deleted: true };
  }
}

