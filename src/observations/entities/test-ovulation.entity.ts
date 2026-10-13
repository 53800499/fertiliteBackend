import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { SyncEnum } from '../../cycles/entities/cycle-enums';
import { ResultatTestLhEnum } from './observation-enums';

@Entity({ name: 'test_ovulation' })
export class TestOvulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({ name: 'heure_test', type: 'time', nullable: true })
  heureTest: string | null;

  @Column({
    name: 'resultat',
    type: 'enum',
    enum: ResultatTestLhEnum,
  })
  resultat: ResultatTestLhEnum;

  @Column({
    name: 'valeur_m_ui_ml',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) =>
        value !== null ? (typeof value === 'string' ? parseFloat(value) : value) : null,
    },
  })
  valeurMUiMl: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'id_client_local', type: 'uuid', nullable: true })
  idClientLocal: string | null;

  @Column({
    name: 'statut_synchronisation',
    type: 'enum',
    enum: SyncEnum,
    default: SyncEnum.SYNCHRONISE,
  })
  statutSynchronisation: SyncEnum;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
