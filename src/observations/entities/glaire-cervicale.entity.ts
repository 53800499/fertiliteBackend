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
import { SyncEnum } from '../../cycles/entities/cycle-enums';
import { TypeGlaireEnum } from './observation-enums';

@Entity({ name: 'glaire_cervicale' })
@Unique(['utilisateurId', 'date'])
export class GlaireCervicale {
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
    name: 'type_glaire',
    type: 'enum',
    enum: TypeGlaireEnum,
  })
  typeGlaire: TypeGlaireEnum;

  @Column({ name: 'quantite', type: 'varchar', length: 50, nullable: true })
  quantite: string | null;

  @Column({ name: 'sensation', type: 'varchar', length: 50, nullable: true })
  sensation: string | null;

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
