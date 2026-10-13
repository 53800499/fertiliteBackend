import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

export enum TypeConsentementEnum {
  CGU = 'cgu',
  POLITIQUE_CONFIDENTIALITE = 'politique_confidentialite',
  PARTAGE_DONNEES_ANONYMISEES = 'partage_donnees_anonymisees',
  ENTRAINEMENT_ML = 'entrainement_ml',
  NOTIFICATIONS_MARKETING = 'notifications_marketing',
}

@Entity('consentement')
export class Consentement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, (user) => user.consentements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({
    name: 'type_consentement',
    type: 'enum',
    enum: TypeConsentementEnum,
  })
  typeConsentement: TypeConsentementEnum;

  @Column({ name: 'version_document', type: 'varchar', length: 20 })
  versionDocument: string;

  @Column({ type: 'boolean', default: true })
  accepte: boolean;

  @CreateDateColumn({ name: 'date_consentement', type: 'timestamptz' })
  dateConsentement: Date;

  @Column({ name: 'date_retrait', type: 'timestamptz', nullable: true })
  dateRetrait: Date | null;

  @Column({ name: 'adresse_ip_consentement', type: 'varchar', length: 45, nullable: true })
  adresseIpConsentement: string | null;
}
