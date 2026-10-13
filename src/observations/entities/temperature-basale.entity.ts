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

@Entity({ name: 'temperature_basale' })
@Unique(['utilisateurId', 'date'])
export class TemperatureBasale {
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
    name: 'temperature_celsius',
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => (typeof value === 'string' ? parseFloat(value) : value),
    },
  })
  temperatureCelsius: number;

  @Column({ name: 'heure_prise', type: 'time', nullable: true })
  heurePrise: string | null;

  @Column({ name: 'est_perturbee', type: 'boolean', default: false })
  estPerturbee: boolean;

  @Column({ name: 'facteur_perturbateur', type: 'varchar', length: 100, nullable: true })
  facteurPerturbateur: string | null;

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
