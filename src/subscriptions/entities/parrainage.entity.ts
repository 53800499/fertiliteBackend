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

export enum StatutParrainageEnum {
  EN_ATTENTE = 'en_attente',
  VALIDE = 'valide',
  RECOMPENSE_ATTRIBUEE = 'recompense_attribuee',
}

@Entity('parrainage')
export class Parrainage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parrain_id', type: 'uuid' })
  @Index()
  parrainId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parrain_id' })
  parrain: Utilisateur;

  @Column({ name: 'filleul_id', type: 'uuid', unique: true })
  @Index()
  filleulId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'filleul_id' })
  filleul: Utilisateur;

  @Column({ name: 'code_utilise', type: 'varchar', length: 30 })
  codeUtilise: string;

  @Column({
    type: 'enum',
    enum: StatutParrainageEnum,
    default: StatutParrainageEnum.RECOMPENSE_ATTRIBUEE,
  })
  statut: StatutParrainageEnum;

  @Column({ name: 'jours_accordes_parrain', type: 'int', default: 30 })
  joursAccordesParrain: number;

  @Column({ name: 'jours_accordes_filleul', type: 'int', default: 30 })
  joursAccordesFilleul: number;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @Column({ name: 'date_validation', type: 'timestamptz', nullable: true })
  dateValidation: Date | null;
}

