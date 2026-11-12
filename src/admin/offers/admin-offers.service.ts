import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionOffer } from '../../super-admin/entities/subscription-offer.entity';
import {
  ADMIN_AUDIT_LOGGER,
  type IAdminAuditLogger,
} from '../shared/admin-audit.service';
import type { AdminActor } from '../shared/admin-actor.helper';

@Injectable()
export class AdminOffersService {
  constructor(
    @InjectRepository(SubscriptionOffer)
    private readonly offerRepo: Repository<SubscriptionOffer>,
    @Inject(ADMIN_AUDIT_LOGGER)
    private readonly auditLogger: IAdminAuditLogger,
  ) {}

  async ensureDefaultOffers(): Promise<SubscriptionOffer[]> {
    const existing = await this.offerRepo.find({ order: { ordreAffichage: 'ASC' } });
    if (existing.length > 0) return existing;

    const defaults = [
      this.offerRepo.create({
        code: 'gratuit',
        nom: 'Essentiel Physiologique',
        description: 'Suivi de cycle et informations essentielles.',
        prix: 0,
        devise: 'XOF',
        periode: 'illimite',
        dureeJours: 0,
        essaiGratuitJours: 0,
        fonctionnalites: [
          'Calendrier menstruel intuitif',
          'Estimation de base',
          'Saisie quotidienne (glaire, température, humeur)',
        ],
        actif: true,
        populaire: false,
        ordreAffichage: 1,
      }),
      this.offerRepo.create({
        code: 'premium_mensuel',
        nom: 'Premium Sérénité Mensuel',
        description: 'Suivi avancé, courbe BBT et bilan médical.',
        prix: 1000,
        devise: 'XOF',
        periode: 'mensuel',
        dureeJours: 30,
        essaiGratuitJours: 7,
        fonctionnalites: [
          'Fenêtre fertile haute précision',
          'Courbe BBT & décalage thermique',
          'Bilan médical PDF & historique illimité',
        ],
        actif: true,
        populaire: false,
        ordreAffichage: 2,
      }),
      this.offerRepo.create({
        code: 'premium_annuel',
        nom: 'Premium Sérénité Annuel',
        description: '12 mois complets avec 2 mois offerts.',
        prix: 10000,
        devise: 'XOF',
        periode: 'annuel',
        dureeJours: 365,
        essaiGratuitJours: 14,
        fonctionnalites: [
          'Tous les avantages Premium',
          '2 mois offerts (10 000 XOF/an)',
          'Analyses comparatives 12 mois',
        ],
        actif: true,
        populaire: true,
        ordreAffichage: 3,
      }),
    ];
    return this.offerRepo.save(defaults);
  }

  listOffers() {
    return this.ensureDefaultOffers();
  }

  async upsertOffer(dto: Partial<SubscriptionOffer>, actor: AdminActor) {
    if (!dto.code?.trim() || !dto.nom?.trim()) {
      throw new BadRequestException("Le code et le nom de l'offre sont requis.");
    }
    const existing = await this.offerRepo.findOne({ where: { code: dto.code.trim() } });
    const entity = existing
      ? Object.assign(existing, dto)
      : this.offerRepo.create({
          code: dto.code.trim(),
          nom: dto.nom.trim(),
          description: dto.description || null,
          prix: dto.prix ?? 0,
          devise: dto.devise || 'XOF',
          periode: dto.periode || 'mensuel',
          dureeJours: dto.dureeJours ?? 30,
          essaiGratuitJours: dto.essaiGratuitJours ?? 0,
          fonctionnalites: dto.fonctionnalites || [],
          actif: dto.actif ?? true,
          populaire: dto.populaire ?? false,
          ordreAffichage: dto.ordreAffichage ?? 10,
        });
    const saved = await this.offerRepo.save(entity);
    await this.auditLogger.log(actor, 'subscriptions', 'UPSERT_OFFER', 'offre', saved.id, {
      code: saved.code,
      prix: saved.prix,
      actif: saved.actif,
    });
    return saved;
  }
}

