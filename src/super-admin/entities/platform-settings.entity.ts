import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('parametre_plateforme')
export class PlatformSettings {
  @PrimaryColumn({ type: 'varchar', length: 32, default: 'global' })
  id: string;

  @Column({ name: 'nom_plateforme', type: 'varchar', length: 120, default: 'MyFertility' })
  nomPlateforme: string;

  @Column({ name: 'email_contact', type: 'varchar', length: 255, default: 'support@myfertility.bj' })
  emailContact: string;

  @Column({ name: 'telephone_support', type: 'varchar', length: 40, default: '+229 01 90 00 00 00' })
  telephoneSupport: string;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  devise: string;

  @Column({ name: 'langues_disponibles', type: 'jsonb', default: () => "'[\"fr\",\"en\"]'" })
  languesDisponibles: string[];

  @Column({ name: 'version_min_android', type: 'varchar', length: 20, default: '1.0.0' })
  versionMinAndroid: string;

  @Column({ name: 'version_min_ios', type: 'varchar', length: 20, default: '1.0.0' })
  versionMinIos: string;

  @Column({ name: 'mode_maintenance', type: 'boolean', default: false })
  modeMaintenance: boolean;

  @Column({ name: 'message_maintenance', type: 'text', nullable: true })
  messageMaintenance: string | null;

  @Column({ name: 'cgu_version', type: 'varchar', length: 30, default: '2026.1' })
  cguVersion: string;

  @Column({ name: 'politique_version', type: 'varchar', length: 30, default: '2026.1' })
  politiqueVersion: string;

  @Column({ name: 'fournisseur_paiement_actif', type: 'varchar', length: 40, default: 'fedapay' })
  fournisseurPaiementActif: string;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

