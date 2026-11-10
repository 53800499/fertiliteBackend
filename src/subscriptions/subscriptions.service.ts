import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import {
  Abonnement,
  PlanAbonnementEnum,
  StatutAbonnementEnum,
} from './entities/abonnement.entity';
import {
  Parrainage,
  StatutParrainageEnum,
} from './entities/parrainage.entity';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { ApplyReferralDto } from './dto/apply-referral.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Abonnement)
    private readonly abonnementRepository: Repository<Abonnement>,
    @InjectRepository(Parrainage)
    private readonly parrainageRepository: Repository<Parrainage>,
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepository: Repository<Utilisateur>,
  ) {}

  /**
   * Récupère l'abonnement actif courant d'une utilisatrice.
   * Gère l'expiration automatique et le fallback sur le plan gratuit.
   */
  async getCurrentSubscription(userId: string) {
    const now = new Date();

    // Recherche de l'abonnement actif ou en essai le plus récent
    const current = await this.abonnementRepository.findOne({
      where: [
        { utilisateurId: userId, statut: StatutAbonnementEnum.ACTIF },
        { utilisateurId: userId, statut: StatutAbonnementEnum.ESSAI },
      ],
      order: { dateDebut: 'DESC' },
    });

    if (current) {
      // Vérification de la date d'expiration pour les abonnements payants ou essais
      if (current.plan !== PlanAbonnementEnum.GRATUIT && current.dateFin && current.dateFin < now) {
        current.statut = StatutAbonnementEnum.EXPIRE;
        current.renouvellementAutomatique = false;
        await this.abonnementRepository.save(current);

        // Création automatique du statut gratuit de repli
        return this.createDefaultFreeSubscription(userId);
      }

      return this.formatSubscriptionResponse(current);
    }

    // Aucun abonnement actif : création du plan gratuit par défaut
    return this.createDefaultFreeSubscription(userId);
  }

  /**
   * Liste des offres et formules disponibles
   */
  getPlans() {
    return [
      {
        id: PlanAbonnementEnum.GRATUIT,
        nom: 'Essentiel Physiologique (Gratuit)',
        prix: 0,
        devise: 'XOF',
        periode: 'Toujours gratuit',
        description: 'Le socle bienveillant et confidentiel pour suivre vos cycles au quotidien.',
        populaire: false,
        avantages: [
          'Calendrier menstruel intuitif',
          'Estimation physiologique de base',
          'Saisie quotidienne des observations (glaire, température, humeur)',
          'Confidentialité absolue et chiffrement des données',
          'Rappels et notifications de base',
        ],
      },
      {
        id: PlanAbonnementEnum.PREMIUM_MENSUEL,
        nom: 'Premium Sérénité (Mensuel)',
        prix: 2500,
        devise: 'XOF',
        periode: 'par mois',
        description: 'La puissance de l\'algorithme avancé et le décryptage complet de vos biomarqueurs.',
        populaire: false,
        avantages: [
          'Tous les avantages du plan Gratuit',
          'Fenêtre fertile haute précision avec indice de confiance',
          'Détection automatique du décalage thermique (courbe BBT)',
          'Export PDF du Bilan Médical de Cycle pour votre gynécologue / sage-femme',
          'Historique illimité de tous vos cycles passés',
          'Alertes anticipées et conseils personnalisés',
          'Support prioritaire dédié',
        ],
      },
      {
        id: PlanAbonnementEnum.PREMIUM_ANNUEL,
        nom: 'Premium Sérénité (Annuel)',
        prix: 20000,
        devise: 'XOF',
        periode: 'par an (~1 660 XOF/mois)',
        description: 'Une année complète de clarté, sérénité et accompagnement avec 33% de réduction.',
        populaire: true,
        economie: '33% d\'économie',
        avantages: [
          'Tous les avantages Premium inclus',
          '2 mois offerts par rapport au paiement mensuel',
          'Analyses comparatives multi-cycles sur 12 mois',
          'Évolution des phases lutéales et régularité',
          'Accès garanti à toutes les futures fonctionnalités de prédiction',
        ],
      },
    ];
  }

  /**
   * Souscription à une formule payante (mensuelle ou annuelle)
   */
  async subscribe(userId: string, dto: SubscribeDto) {
    if (dto.plan === PlanAbonnementEnum.GRATUIT) {
      throw new BadRequestException('Pour passer au plan gratuit, utilisez la résiliation.');
    }

    const now = new Date();
    const dateFin = new Date(now);

    if (dto.plan === PlanAbonnementEnum.PREMIUM_MENSUEL) {
      dateFin.setDate(dateFin.getDate() + 30);
    } else if (dto.plan === PlanAbonnementEnum.PREMIUM_ANNUEL) {
      dateFin.setDate(dateFin.getDate() + 365);
    }

    // Clôture des anciens abonnements actifs
    await this.abonnementRepository.update(
      {
        utilisateurId: userId,
        statut: StatutAbonnementEnum.ACTIF,
      },
      {
        statut: StatutAbonnementEnum.EXPIRE,
      },
    );

    const montant = dto.montant ?? (dto.plan === PlanAbonnementEnum.PREMIUM_MENSUEL ? 2500 : 20000);
    const devise = dto.devise ?? 'XOF';

    const nouvelAbonnement = this.abonnementRepository.create({
      utilisateurId: userId,
      plan: dto.plan,
      statut: StatutAbonnementEnum.ACTIF,
      dateDebut: now,
      dateFin: dateFin,
      renouvellementAutomatique: true,
      referenceTransaction: dto.referenceTransaction ?? `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fournisseur: dto.fournisseur ?? 'in_app',
      montant,
      devise,
    });

    const saved = await this.abonnementRepository.save(nouvelAbonnement);
    return this.formatSubscriptionResponse(saved);
  }

  /**
   * Résiliation du renouvellement automatique.
   * L'utilisatrice conserve son accès Premium jusqu'à la date d'échéance.
   */
  async cancelSubscription(userId: string) {
    const current = await this.abonnementRepository.findOne({
      where: [
        { utilisateurId: userId, statut: StatutAbonnementEnum.ACTIF },
        { utilisateurId: userId, statut: StatutAbonnementEnum.ESSAI },
      ],
      order: { dateDebut: 'DESC' },
    });

    if (!current || current.plan === PlanAbonnementEnum.GRATUIT) {
      throw new BadRequestException('Vous n\'avez aucun abonnement payant actif à résilier.');
    }

    current.renouvellementAutomatique = false;
    current.statut = StatutAbonnementEnum.ANNULE;
    const updated = await this.abonnementRepository.save(current);

    return {
      message: 'Le renouvellement automatique a bien été interrompu. Vous conservez vos avantages Premium jusqu\'à la fin de la période en cours.',
      abonnement: this.formatSubscriptionResponse(updated),
    };
  }

  /**
   * Récupère le code de parrainage de l'utilisatrice et ses statistiques
   */
  async getReferralInfo(userId: string) {
    let user = await this.utilisateurRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisatrice introuvable.');
    }

    // Génération automatique du code s'il n'existe pas encore
    if (!user.codeParrainage) {
      user.codeParrainage = await this.generateUniqueReferralCode();
      await this.utilisateurRepository.save(user);
    }

    // Récupération des parrainages où l'utilisatrice est marraine
    const parrainages = await this.parrainageRepository.find({
      where: { parrainId: userId },
      order: { dateCreation: 'DESC' },
    });

    // Vérifie si l'utilisatrice a déjà utilisé un code d'invitation
    const parrainageRecu = await this.parrainageRepository.findOne({
      where: { filleulId: userId },
    });

    const totalJoursGagnes = parrainages.reduce((sum, p) => sum + p.joursAccordesParrain, 0);

    return {
      codeParrainage: user.codeParrainage,
      lienPartage: `https://fertiliteapp.com/invitation?ref=${user.codeParrainage}`,
      totalFilleules: parrainages.length,
      totalJoursGagnes,
      peutUtiliserUnCode: !parrainageRecu,
      parrainageActif: true,
      joursOffertsParFilleule: 30,
    };
  }

  /**
   * Applique un code de parrainage saisi par l'utilisatrice (filleule)
   */
  async applyReferralCode(filleulId: string, dto: ApplyReferralDto) {
    const code = dto.code.trim().toUpperCase();

    // 1. Vérification que l'utilisatrice n'a pas déjà bénéficié d'un parrainage
    const existing = await this.parrainageRepository.findOne({
      where: { filleulId },
    });
    if (existing) {
      throw new ConflictException('Vous avez déjà utilisé un code de parrainage.');
    }

    // 2. Recherche du parrain propriétaire du code
    const parrain = await this.utilisateurRepository.findOne({
      where: { codeParrainage: code },
    });
    if (!parrain) {
      throw new NotFoundException('Ce code de parrainage n\'existe pas ou est erroné.');
    }

    // 3. Empêcher l'auto-parrainage
    if (parrain.id === filleulId) {
      throw new BadRequestException('Vous ne pouvez pas utiliser votre propre code de parrainage.');
    }

    const now = new Date();

    // 4. Création de l'enregistrement de parrainage
    const parrainage = this.parrainageRepository.create({
      parrainId: parrain.id,
      filleulId,
      codeUtilise: code,
      statut: StatutParrainageEnum.RECOMPENSE_ATTRIBUEE,
      joursAccordesParrain: 30,
      joursAccordesFilleul: 30,
      dateValidation: now,
    });
    await this.parrainageRepository.save(parrainage);

    // 5. Attribution du bonus Premium de 30 jours à la filleule
    await this.prolongOrActivatePremium(filleulId, 30, 'parrainage_filleule');

    // 6. Attribution du bonus Premium de 30 jours à la marraine
    await this.prolongOrActivatePremium(parrain.id, 30, 'parrainage_marraine');

    const updatedSub = await this.getCurrentSubscription(filleulId);

    return {
      message: 'Félicitations ! Votre code a été validé avec succès. Vous bénéficiez de 30 jours d\'accès Premium offert ! 🎉',
      bonusJours: 30,
      abonnement: updatedSub,
    };
  }

  /**
   * Historique détaillé des amies invitées
   */
  async getReferralHistory(userId: string) {
    const list = await this.parrainageRepository.find({
      where: { parrainId: userId },
      relations: { filleul: true },
      order: { dateCreation: 'DESC' },
    });

    return list.map((p, index) => ({
      id: p.id,
      date: p.dateCreation,
      libelle: `Amie invitée #${index + 1}`,
      statut: p.statut,
      joursGagnes: p.joursAccordesParrain,
    }));
  }

  // --- Méthodes privées d'assistance ---

  /**
   * Prolonge ou active une période Premium offerte
   */
  private async prolongOrActivatePremium(userId: string, jours: number, motif: string) {
    const now = new Date();
    const current = await this.abonnementRepository.findOne({
      where: [
        { utilisateurId: userId, statut: StatutAbonnementEnum.ACTIF },
        { utilisateurId: userId, statut: StatutAbonnementEnum.ESSAI },
      ],
      order: { dateDebut: 'DESC' },
    });

    if (current && current.plan !== PlanAbonnementEnum.GRATUIT && current.dateFin && current.dateFin > now) {
      // Prolongation de l'abonnement Premium existant
      const newEndDate = new Date(current.dateFin);
      newEndDate.setDate(newEndDate.getDate() + jours);
      current.dateFin = newEndDate;
      await this.abonnementRepository.save(current);
    } else {
      // Activation d'une période d'essai Premium
      if (current) {
        current.statut = StatutAbonnementEnum.EXPIRE;
        await this.abonnementRepository.save(current);
      }

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + jours);

      const bonusSub = this.abonnementRepository.create({
        utilisateurId: userId,
        plan: PlanAbonnementEnum.PREMIUM_MENSUEL,
        statut: StatutAbonnementEnum.ESSAI,
        dateDebut: now,
        dateFin: endDate,
        renouvellementAutomatique: false,
        referenceTransaction: `REWARD-${motif.toUpperCase()}-${Date.now()}`,
        fournisseur: 'parrainage',
        montant: 0,
        devise: 'XOF',
      });
      await this.abonnementRepository.save(bonusSub);
    }
  }

  private async createDefaultFreeSubscription(userId: string) {
    const freeSub = this.abonnementRepository.create({
      utilisateurId: userId,
      plan: PlanAbonnementEnum.GRATUIT,
      statut: StatutAbonnementEnum.ACTIF,
      dateDebut: new Date(),
      dateFin: null,
      renouvellementAutomatique: false,
      fournisseur: 'systeme',
      montant: 0,
      devise: 'XOF',
    });

    const saved = await this.abonnementRepository.save(freeSub);
    return this.formatSubscriptionResponse(saved);
  }

  private formatSubscriptionResponse(sub: Abonnement) {
    const now = new Date();
    const isPremium =
      sub.plan !== PlanAbonnementEnum.GRATUIT &&
      (sub.statut === StatutAbonnementEnum.ACTIF ||
        sub.statut === StatutAbonnementEnum.ESSAI ||
        sub.statut === StatutAbonnementEnum.ANNULE) &&
      (!sub.dateFin || sub.dateFin >= now);

    let joursRestants: number | null = null;
    if (sub.dateFin) {
      const diffTime = sub.dateFin.getTime() - now.getTime();
      joursRestants = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      id: sub.id,
      plan: sub.plan,
      statut: sub.statut,
      isPremium,
      dateDebut: sub.dateDebut,
      dateFin: sub.dateFin,
      joursRestants,
      renouvellementAutomatique: sub.renouvellementAutomatique,
      fournisseur: sub.fournisseur,
      montant: sub.montant,
      devise: sub.devise,
      libellePlan: this.getPlanLabel(sub.plan),
      avantagesActifs: isPremium
        ? [
            'Fenêtre fertile haute précision',
            'Détection automatique de la hausse BBT',
            'Export PDF du Bilan Médical',
            'Historique complet illimité',
            'Alertes intelligentes prioritaires',
          ]
        : [
            'Calendrier menstruel intuitif',
            'Estimation standard',
            'Saisie quotidienne des observations',
          ],
    };
  }

  private getPlanLabel(plan: PlanAbonnementEnum): string {
    switch (plan) {
      case PlanAbonnementEnum.PREMIUM_ANNUEL:
        return 'Premium Annuel ⭐';
      case PlanAbonnementEnum.PREMIUM_MENSUEL:
        return 'Premium Mensuel ⭐';
      default:
        return 'Plan Essentiel (Gratuit)';
    }
  }

  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let exists = true;

    while (exists) {
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `FERT-${suffix}`;

      const found = await this.utilisateurRepository.findOne({
        where: { codeParrainage: code },
      });
      if (!found) {
        exists = false;
      }
    }

    return code;
  }
}
