import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

@Entity({ name: 'preference_notification' })
export class PreferenceNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid', unique: true })
  utilisateurId: string;

  @OneToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'rappel_saisie_actif', type: 'boolean', default: true })
  rappelSaisieActif: boolean;

  @Column({ name: 'heure_rappel_saisie', type: 'varchar', length: 5, default: '20:00' })
  heureRappelSaisie: string;

  @Column({ name: 'alerte_fenetre_fertile', type: 'boolean', default: true })
  alerteFenetreFertile: boolean;

  @Column({ name: 'alerte_regles_prevues', type: 'boolean', default: true })
  alerteReglesPrevues: boolean;

  @Column({ name: 'canal_push', type: 'boolean', default: true })
  canalPush: boolean;

  @Column({ name: 'canal_email', type: 'boolean', default: false })
  canalEmail: boolean;

  @Column({ name: 'canal_in_app', type: 'boolean', default: true })
  canalInApp: boolean;

  @Column({ name: 'fcm_token', type: 'text', nullable: true })
  fcmToken: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}
