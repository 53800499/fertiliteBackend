import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('offre_abonnement')
export class SubscriptionOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  prix: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  devise: string;

  @Column({ type: 'varchar', length: 40, default: 'mensuel' })
  periode: string;

  @Column({ name: 'duree_jours', type: 'int', default: 30 })
  dureeJours: number;

  @Column({ name: 'essai_gratuit_jours', type: 'int', default: 0 })
  essaiGratuitJours: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  fonctionnalites: string[];

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'boolean', default: false })
  populaire: boolean;

  @Column({ name: 'ordre_affichage', type: 'int', default: 0 })
  ordreAffichage: number;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

