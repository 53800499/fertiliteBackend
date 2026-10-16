import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { TypeRapportEnum } from './observation-enums';
import { SyncEnum } from '../../cycles/entities/cycle-enums';

@Entity({ name: 'rapport_sexuel' })
@Unique(['utilisateurId', 'date'])
export class RapportSexuel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({
    name: 'type_rapport',
    type: 'enum',
    enum: TypeRapportEnum,
    default: TypeRapportEnum.NON_PROTEGE,
  })
  typeRapport: TypeRapportEnum;

  @Column({ name: 'heure', type: 'time', nullable: true })
  heure: string | null;

  @Column({ name: 'contraception_urgence', type: 'boolean', default: false })
  contraceptionUrgence: boolean;

  @Column({ name: 'notes_chiffrees', type: 'text', nullable: true })
  notesChiffrees: string | null;

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

  /**
   * Propriété calculée déchiffrée retournée aux clients authentifiés
   */
  notes?: string | null;
}
