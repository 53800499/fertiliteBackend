import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('code_promo')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ name: 'pourcentage_reduction', type: 'int', default: 0 })
  pourcentageReduction: number;

  @Column({ name: 'montant_fixe', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montantFixe: number;

  @Column({ name: 'utilisations_max', type: 'int', default: 100 })
  utilisationsMax: number;

  @Column({ name: 'utilisations_actuelles', type: 'int', default: 0 })
  utilisationsActuelles: number;

  @Column({ name: 'date_expiration', type: 'timestamptz', nullable: true })
  dateExpiration: Date | null;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

