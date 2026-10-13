import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TypeMoteurEnum } from './fertility-enums';
import { Prediction } from './prediction.entity';

@Entity('version_moteur_prediction')
export class VersionMoteurPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'numero_version', type: 'varchar', length: 20, unique: true })
  numeroVersion: string;

  @Column({
    name: 'type_moteur',
    type: 'enum',
    enum: TypeMoteurEnum,
    default: TypeMoteurEnum.REGLES_STATISTIQUES,
  })
  typeMoteur: TypeMoteurEnum;

  @CreateDateColumn({ name: 'date_deploiement', type: 'timestamptz' })
  dateDeploiement: Date;

  @Column({ name: 'date_retrait', type: 'timestamptz', nullable: true })
  dateRetrait: Date | null;

  @Column({ name: 'metriques_performance', type: 'jsonb', nullable: true })
  metriquesPerformance: Record<string, any> | null;

  @Column({ name: 'actif', type: 'boolean', default: true })
  actif: boolean;

  @OneToMany(() => Prediction, (pred) => pred.versionMoteur)
  predictions: Prediction[];
}
