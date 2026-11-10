import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

export enum PlanAbonnementEnum {
  GRATUIT = 'gratuit',
  PREMIUM_MENSUEL = 'premium_mensuel',
  PREMIUM_ANNUEL = 'premium_annuel',
}

export enum StatutAbonnementEnum {
  ACTIF = 'actif',
  ESSAI = 'essai',
  EXPIRE = 'expire',
  ANNULE = 'annule',
}

@Entity('abonnement')
export class Abonnement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  @Index()
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({
    type: 'enum',
    enum: PlanAbonnementEnum,
    default: PlanAbonnementEnum.GRATUIT,
  })
  plan: PlanAbonnementEnum;

  @Column({
    type: 'enum',
    enum: StatutAbonnementEnum,
    default: StatutAbonnementEnum.ACTIF,
  })
  @Index()
  statut: StatutAbonnementEnum;

  @Column({ name: 'date_debut', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  dateDebut: Date;

  @Column({ name: 'date_fin', type: 'timestamptz', nullable: true })
  dateFin: Date | null;

  @Column({ name: 'renouvellement_automatique', type: 'boolean', default: false })
  renouvellementAutomatique: boolean;

  @Column({ name: 'reference_transaction', type: 'varchar', length: 150, nullable: true })
  referenceTransaction: string | null;

  @Column({ name: 'fournisseur', type: 'varchar', length: 50, default: 'in_app' })
  fournisseur: string;

  @Column({ name: 'montant', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montant: number;

  @Column({ name: 'devise', type: 'varchar', length: 3, default: 'XOF' })
  devise: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

