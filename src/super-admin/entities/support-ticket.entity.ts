import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ticket_support')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid', nullable: true })
  utilisateurId: string | null;

  @Column({ name: 'utilisateur_email', type: 'varchar', length: 255 })
  utilisateurEmail: string;

  @Column({ type: 'varchar', length: 200 })
  sujet: string;

  @Column({ type: 'varchar', length: 60, default: 'compte' })
  categorie: string;

  @Column({ type: 'varchar', length: 40, default: 'normale' })
  priorite: string;

  @Column({ type: 'varchar', length: 40, default: 'nouveau' })
  statut: string;

  @Column({ name: 'assigne_a', type: 'varchar', length: 160, nullable: true })
  assigneA: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages: Array<{
    auteur: string;
    contenu: string;
    date: string;
    interne?: boolean;
  }>;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

