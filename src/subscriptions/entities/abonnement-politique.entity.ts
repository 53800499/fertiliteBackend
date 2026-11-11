import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('abonnement_politique')
export class AbonnementPolitique {
  @PrimaryColumn({ type: 'varchar', length: 32, default: 'global' })
  id: string;

  /**
   * Décision Super Admin : si true, toute installation initiale exige de passer par
   * l'écran d'abonnement la première fois (avec possibilité de continuer en gratuit ensuite).
   */
  @Column({ name: 'exigence_abonnement_initiale', type: 'boolean', default: false })
  exigenceAbonnementInitiale: boolean;

  /**
   * Décision Super Admin : si true, les fonctionnalités avancées (Bilan médical, BBT,
   * historique > 3 cycles, facteurs de fertilité) requièrent un abonnement Premium.
   */
  @Column({ name: 'exigence_paywalls_premium', type: 'boolean', default: true })
  exigencePaywallsPremium: boolean;

  /**
   * Message de recommandation d'activation affiché aux utilisatrices en plan gratuit.
   */
  @Column({ name: 'message_recommandation', type: 'text', nullable: true })
  messageRecommandation: string | null;

  @Column({ name: 'modifie_par', type: 'varchar', length: 255, nullable: true })
  modifiePar: string | null;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

