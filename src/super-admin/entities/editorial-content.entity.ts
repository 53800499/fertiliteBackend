import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contenu_editorial')
export class EditorialContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 220 })
  titre: string;

  @Column({ type: 'varchar', length: 60, default: 'fertilite' })
  categorie: string;

  @Column({ type: 'text', nullable: true })
  resume: string | null;

  @Column({ type: 'text' })
  contenu: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 120, default: 'Équipe Médicale MyFertility' })
  auteur: string;

  @Column({ type: 'varchar', length: 40, default: 'brouillon' })
  statut: string;

  @Column({ name: 'validation_medicale_requise', type: 'boolean', default: true })
  validationMedicaleRequise: boolean;

  @Column({ name: 'valide_par', type: 'varchar', length: 160, nullable: true })
  validePar: string | null;

  @Column({ name: 'date_publication_programmee', type: 'timestamptz', nullable: true })
  datePublicationProgrammee: Date | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

