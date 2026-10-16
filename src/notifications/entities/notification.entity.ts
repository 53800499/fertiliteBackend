import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import {
  TypeNotificationEnum,
  CanalNotificationEnum,
  StatutNotificationEnum,
} from './notification-enums';

@Entity({ name: 'notification' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({
    name: 'type',
    type: 'enum',
    enum: TypeNotificationEnum,
    default: TypeNotificationEnum.RAPPEL_SAISIE,
  })
  type: TypeNotificationEnum;

  @Column({
    name: 'canal',
    type: 'enum',
    enum: CanalNotificationEnum,
    default: CanalNotificationEnum.PUSH,
  })
  canal: CanalNotificationEnum;

  @Column({
    name: 'statut',
    type: 'enum',
    enum: StatutNotificationEnum,
    default: StatutNotificationEnum.PLANIFIEE,
  })
  statut: StatutNotificationEnum;

  @Column({ name: 'titre', type: 'varchar', length: 255 })
  titre: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({
    name: 'donnees_supplementaires',
    type: 'jsonb',
    nullable: true,
  })
  donneesSupplementaires: Record<string, any> | null;

  @Column({ name: 'date_planifiee', type: 'timestamptz' })
  datePlanifiee: Date;

  @Column({ name: 'date_envoi', type: 'timestamptz', nullable: true })
  dateEnvoi: Date | null;

  @Column({ name: 'date_lecture', type: 'timestamptz', nullable: true })
  dateLecture: Date | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}
