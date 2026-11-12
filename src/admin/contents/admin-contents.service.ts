import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EditorialContent } from '../../super-admin/entities/editorial-content.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminContentsService {
  constructor(
    @InjectRepository(EditorialContent)
    private readonly contentRepo: Repository<EditorialContent>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async listContents(status?: string) {
    const where = status && status !== 'tous' ? { statut: status } : {};
    return this.contentRepo.find({ where, order: { dateMaj: 'DESC' } });
  }

  async createContent(dto: Partial<EditorialContent>, actor: AdminActor) {
    if (!dto.titre?.trim() || !dto.contenu?.trim()) {
      throw new BadRequestException('Le titre et le contenu sont obligatoires.');
    }
    const content = this.contentRepo.create({
      titre: dto.titre.trim(),
      categorie: dto.categorie || 'fertilite',
      resume: dto.resume || null,
      contenu: dto.contenu.trim(),
      imageUrl: dto.imageUrl || null,
      auteur: dto.auteur || actor.email,
      statut: dto.statut || 'brouillon',
      validationMedicaleRequise: dto.validationMedicaleRequise ?? true,
      datePublicationProgrammee: dto.datePublicationProgrammee || null,
    });
    const saved = await this.contentRepo.save(content);
    await this.auditLogger.log(actor, 'contents', 'CREATE_CONTENT', 'contenu', saved.id, {
      titre: saved.titre,
      statut: saved.statut,
    });
    return saved;
  }

  async updateContent(id: string, dto: Partial<EditorialContent>, actor: AdminActor) {
    const content = await this.contentRepo.findOne({ where: { id } });
    if (!content) throw new NotFoundException('Contenu introuvable.');
    if (
      dto.statut === 'publie' &&
      content.validationMedicaleRequise &&
      !content.validePar &&
      !dto.validePar
    ) {
      throw new BadRequestException(
        'Ce contenu sensible requiert une validation médicale avant publication.',
      );
    }
    Object.assign(content, {
      ...(dto.titre !== undefined && { titre: dto.titre }),
      ...(dto.categorie !== undefined && { categorie: dto.categorie }),
      ...(dto.resume !== undefined && { resume: dto.resume }),
      ...(dto.contenu !== undefined && { contenu: dto.contenu }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.auteur !== undefined && { auteur: dto.auteur }),
      ...(dto.statut !== undefined && { statut: dto.statut }),
      ...(dto.validationMedicaleRequise !== undefined && {
        validationMedicaleRequise: dto.validationMedicaleRequise,
      }),
      ...(dto.validePar !== undefined && { validePar: dto.validePar }),
    });
    const saved = await this.contentRepo.save(content);
    await this.auditLogger.log(actor, 'contents', 'UPDATE_CONTENT', 'contenu', id, {
      statut: saved.statut,
    });
    return saved;
  }

  async validateContentMedically(id: string, actor: AdminActor) {
    const content = await this.contentRepo.findOne({ where: { id } });
    if (!content) throw new NotFoundException('Contenu introuvable.');
    content.validePar = actor.email;
    content.statut = 'publie';
    const saved = await this.contentRepo.save(content);
    await this.auditLogger.log(actor, 'contents', 'MEDICAL_VALIDATE_CONTENT', 'contenu', id, {
      validePar: actor.email,
    });
    return saved;
  }

  async deleteContent(id: string, actor: AdminActor) {
    await this.contentRepo.delete(id);
    await this.auditLogger.log(actor, 'contents', 'DELETE_CONTENT', 'contenu', id);
    return { deleted: true };
  }
}

