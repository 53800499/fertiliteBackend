import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('admin_audit_log')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'varchar', length: 120, nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 255 })
  actorEmail: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, default: 'super_admin' })
  actorRole: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  module: string;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ name: 'target_type', type: 'varchar', length: 80, nullable: true })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'varchar', length: 120, nullable: true })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;
}

