import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Cycle } from './cycle.entity';
import { IntensiteFluxEnum, SyncEnum } from './cycle-enums';

export { IntensiteFluxEnum, SyncEnum } from './cycle-enums';

@Entity({ name: 'jour_regles' })
@Unique(['cycleId', 'date'])
export class JourRegles {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @ManyToOne(() => Cycle, (cycle) => cycle.joursRegles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;

  @Column({ name: 'date', type: 'date' })
  date: string;

  @Column({
    name: 'intensite_flux',
    type: 'enum',
    enum: IntensiteFluxEnum,
  })
  intensiteFlux: IntensiteFluxEnum;

  @Column({ name: 'douleur_niveau', type: 'smallint', nullable: true })
  douleurNiveau: number | null;

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

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}
