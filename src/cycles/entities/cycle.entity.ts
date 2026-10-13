import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { JourRegles } from './jour-regles.entity';
import { StatutCycleEnum, SourceSaisieEnum, SyncEnum } from './cycle-enums';

export { StatutCycleEnum, SourceSaisieEnum, SyncEnum } from './cycle-enums';

@Entity({ name: 'cycle' })
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'date_debut', type: 'date' })
  dateDebut: string;

  @Column({ name: 'date_fin', type: 'date', nullable: true })
  dateFin: string | null;

  @Column({ name: 'duree_cycle_jours', type: 'smallint', nullable: true })
  dureeCycleJours: number | null;

  @Column({ name: 'duree_regles_jours', type: 'smallint', nullable: true })
  dureeReglesJours: number | null;

  @Column({
    name: 'statut',
    type: 'enum',
    enum: StatutCycleEnum,
    default: StatutCycleEnum.EN_COURS,
  })
  statut: StatutCycleEnum;

  @Column({
    name: 'source_saisie',
    type: 'enum',
    enum: SourceSaisieEnum,
    default: SourceSaisieEnum.MANUELLE,
  })
  sourceSaisie: SourceSaisieEnum;

  @Column({ name: 'id_client_local', type: 'uuid', nullable: true })
  idClientLocal: string | null;

  @Column({
    name: 'statut_synchronisation',
    type: 'enum',
    enum: SyncEnum,
    default: SyncEnum.SYNCHRONISE,
  })
  statutSynchronisation: SyncEnum;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;

  @OneToMany(() => JourRegles, (jour) => jour.cycle, { cascade: true })
  joursRegles: JourRegles[];
}
