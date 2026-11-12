import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode } from '../../super-admin/entities/promo-code.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminPromotionsService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  listPromos() {
    return this.promoRepo.find({ order: { dateCreation: 'DESC' } });
  }

  async createPromo(dto: Partial<PromoCode>, actor: AdminActor) {
    if (!dto.code?.trim()) {
      throw new BadRequestException('Le code promotionnel est obligatoire.');
    }
    const normalized = dto.code.trim().toUpperCase();
    const exists = await this.promoRepo.findOne({ where: { code: normalized } });
    if (exists) throw new ConflictException('Ce code promo existe déjà.');

    const promo = this.promoRepo.create({
      code: normalized,
      description: dto.description || null,
      pourcentageReduction: dto.pourcentageReduction ?? 10,
      montantFixe: dto.montantFixe ?? 0,
      utilisationsMax: dto.utilisationsMax ?? 100,
      dateExpiration: dto.dateExpiration || null,
      actif: dto.actif ?? true,
    });
    const saved = await this.promoRepo.save(promo);
    await this.auditLogger.log(actor, 'promotions', 'CREATE_PROMO', 'code_promo', saved.id, {
      code: saved.code,
    });
    return saved;
  }

  async togglePromo(id: string, actif: boolean, actor: AdminActor) {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo introuvable.');
    promo.actif = actif;
    const saved = await this.promoRepo.save(promo);
    await this.auditLogger.log(actor, 'promotions', 'TOGGLE_PROMO', 'code_promo', id, { actif });
    return saved;
  }
}

