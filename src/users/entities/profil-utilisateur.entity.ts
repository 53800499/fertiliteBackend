import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Utilisateur } from './utilisateur.entity';

export enum ObjectifEnum {
  SUIVI_CYCLE = 'suivi_cycle',
  PLANIFIER_GROSSESSE = 'planifier_grossesse',
  EVITER_GROSSESSE = 'eviter_grossesse',
  COMPRENDRE_CORPS = 'comprendre_corps',
}

@Entity('profil_utilisateur')
export class ProfilUtilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid', unique: true })
  utilisateurId: string;

  @OneToOne(() => Utilisateur, (user) => user.profil, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ type: 'varchar', length: 100, nullable: true })
  prenom: string | null;

  @Column({
    name: 'objectif_principal',
    type: 'enum',
    enum: ObjectifEnum,
    default: ObjectifEnum.SUIVI_CYCLE,
  })
  objectifPrincipal: ObjectifEnum;

  @Column({
    name: 'duree_cycle_habituelle_jours',
    type: 'smallint',
    default: 28,
    nullable: true,
  })
  dureeCycleHabituelleJours: number | null;

  @Column({
    name: 'duree_regles_habituelle_jours',
    type: 'smallint',
    default: 5,
    nullable: true,
  })
  dureeReglesHabituelleJours: number | null;

  @Column({ name: 'irregularite_declaree', type: 'boolean', default: false })
  irregulariteDeclaree: boolean;

  @Column({ name: 'date_dernieres_regles_connues', type: 'date', nullable: true })
  dateDernieresReglesConnues: string | null;
}
