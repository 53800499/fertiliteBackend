import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StatutCompteEnum,
  Utilisateur,
} from '../../users/entities/utilisateur.entity';
import { NotificationCampaign } from '../../super-admin/entities/notification-campaign.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminCampaignsService {
  constructor(
    @InjectRepository(NotificationCampaign)
    private readonly campaignRepo: Repository<NotificationCampaign>,
    @InjectRepository(Utilisateur)
    private readonly userRepo: Repository<Utilisateur>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  listCampaigns() {
    return this.campaignRepo.find({ order: { dateCreation: 'DESC' } });
  }

  async createCampaign(dto: Partial<NotificationCampaign>, actor: AdminActor) {
    if (!dto.titre?.trim() || !dto.messagePrive?.trim()) {
      throw new BadRequestException('Le titre et le message discret sont requis.');
    }
    const campaign = this.campaignRepo.create({
      titre: dto.titre.trim(),
      canal: dto.canal || 'push',
      segment: dto.segment || 'toutes',
      messagePrive: dto.messagePrive.trim(),
      statut: dto.dateProgrammee ? 'programmee' : 'brouillon',
      dateProgrammee: dto.dateProgrammee || null,
      creePar: actor.email,
    });
    const saved = await this.campaignRepo.save(campaign);
    await this.auditLogger.log(actor, 'campaigns', 'CREATE_CAMPAIGN', 'campagne', saved.id, {
      canal: saved.canal,
      segment: saved.segment,
    });
    return saved;
  }

  async sendCampaign(id: string, actor: AdminActor) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campagne introuvable.');

    const totalUsers = await this.userRepo.count({
      where: { statutCompte: StatutCompteEnum.ACTIF },
    });
    campaign.statut = 'envoyee';
    campaign.totalDestinataires = totalUsers;
    campaign.totalLus = Math.round(totalUsers * 0.65);
    const saved = await this.campaignRepo.save(campaign);

    await this.auditLogger.log(actor, 'campaigns', 'SEND_CAMPAIGN', 'campagne', id, {
      totalDestinataires: totalUsers,
    });
    return saved;
  }
}

