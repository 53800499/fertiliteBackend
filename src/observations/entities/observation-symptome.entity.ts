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
import { TypeSymptome } from './type-symptome.entity';
import { SyncEnum } from '../../cycles/entities/cycle-enums';

@Entity({ name: 'observation_symptome' })
@Unique(['utilisateurId', 'date', 'typeSymptomeId'])
export class ObservationSymptome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({ name: 'type_symptome_id', type: 'uuid' })
  typeSymptomeId: string;

  @ManyToOne(() => TypeSymptome, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'type_symptome_id' })
  typeSymptome: TypeSymptome;

  @Column({ name: 'intensite', type: 'smallint' })
  intensite: number;

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
