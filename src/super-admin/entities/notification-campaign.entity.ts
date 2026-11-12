import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('campagne_notification')
export class NotificationCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  @Column({ type: 'varchar', length: 40, default: 'push' })
  canal: string;

  @Column({ type: 'varchar', length: 60, default: 'toutes' })
  segment: string;

  @Column({ name: 'message_prive', type: 'text' })
  messagePrive: string;

  @Column({ type: 'varchar', length: 40, default: 'brouillon' })
  statut: string;

  @Column({ name: 'date_programmee', type: 'timestamptz', nullable: true })
  dateProgrammee: Date | null;

  @Column({ name: 'total_destinataires', type: 'int', default: 0 })
  totalDestinataires: number;

  @Column({ name: 'total_lus', type: 'int', default: 0 })
  totalLus: number;

  @Column({ name: 'cree_par', type: 'varchar', length: 160, nullable: true })
  creePar: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

