import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SpecialiteProEnum {
  GYNECOLOGUE = 'gynecologue',
  SAGE_FEMME = 'sage_femme',
  FERTILITE = 'fertilite',
  PSYCHOLOGUE = 'psychologue',
  CONSEILLER = 'conseiller',
}

export enum StatutValidationProEnum {
  EN_ATTENTE = 'en_attente',
  VALIDE = 'valide',
  REJETE = 'rejete',
  SUSPENDU = 'suspendu',
}

@Entity('professionnel_sante')
export class HealthcareProfessional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nom_complet', type: 'varchar', length: 160 })
  nomComplet: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SpecialiteProEnum.GYNECOLOGUE,
  })
  specialite: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  etablissement: string | null;

  @Column({ type: 'varchar', length: 100, default: 'Cotonou' })
  commune: string;

  @Column({ type: 'varchar', length: 100, default: 'Littoral' })
  departement: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'numero_ordre', type: 'varchar', length: 80, nullable: true })
  numeroOrdre: string | null;

  @Column({
    name: 'statut_validation',
    type: 'varchar',
    length: 40,
    default: StatutValidationProEnum.EN_ATTENTE,
  })
  statutValidation: string;

  @Column({ name: 'diplome_verifie', type: 'boolean', default: false })
  diplomeVerifie: boolean;

  @Column({ name: 'note_moyenne', type: 'numeric', precision: 3, scale: 2, default: 4.8 })
  noteMoyenne: number;

  @Column({ name: 'nb_evaluations', type: 'int', default: 0 })
  nbEvaluations: number;

  @Column({ type: 'text', nullable: true })
  disponibilites: string | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;
}

