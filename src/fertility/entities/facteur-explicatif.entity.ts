import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prediction } from './prediction.entity';
import { TypeFacteurEnum, SensEffetEnum } from './fertility-enums';

@Entity('facteur_explicatif')
export class FacteurExplicatif {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prediction_id', type: 'uuid' })
  predictionId: string;

  @ManyToOne(() => Prediction, (pred) => pred.facteurs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prediction_id' })
  prediction: Prediction;

  @Column({
    name: 'type_facteur',
    type: 'enum',
    enum: TypeFacteurEnum,
  })
  typeFacteur: TypeFacteurEnum;

  @Column({ type: 'text' })
  description: string;

  @Column({
    name: 'poids_contribution',
    type: 'numeric',
    precision: 4,
    scale: 3,
    default: 0.1,
  })
  poidsContribution: number;

  @Column({
    name: 'sens_effet',
    type: 'enum',
    enum: SensEffetEnum,
    default: SensEffetEnum.NEUTRE,
  })
  sensEffet: SensEffetEnum;

  @Column({ name: 'ordre_affichage', type: 'smallint', default: 0 })
  ordreAffichage: number;
}
