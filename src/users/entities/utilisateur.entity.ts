import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { ProfilUtilisateur } from './profil-utilisateur.entity';
import { ParametreConfidentialite } from '../../privacy/entities/parametre-confidentialite.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { SessionAuthentification } from '../../auth/entities/session-authentification.entity';

export enum StatutCompteEnum {
  ACTIF = 'actif',
  SUSPENDU = 'suspendu',
  SUPPRIME = 'supprime',
}

@Entity('utilisateur')
export class Utilisateur {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'mot_de_passe_hash', type: 'varchar', length: 255 })
  motDePasseHash: string;

  @Column({ name: 'date_naissance', type: 'date' })
  dateNaissance: string;

  @Column({
    name: 'statut_compte',
    type: 'enum',
    enum: StatutCompteEnum,
    default: StatutCompteEnum.ACTIF,
  })
  statutCompte: StatutCompteEnum;

  @Column({ name: 'email_verifie', type: 'boolean', default: false })
  emailVerifie: boolean;

  @Column({ name: 'langue_preferee', type: 'varchar', length: 5, default: 'fr' })
  languePreferee: string;

  @Column({ name: 'fuseau_horaire', type: 'varchar', length: 50, default: 'Africa/Porto-Novo' })
  fuseauHoraire: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamptz' })
  dateMaj: Date;

  @Column({ name: 'date_derniere_connexion', type: 'timestamptz', nullable: true })
  dateDerniereConnexion: Date | null;

  @Column({ name: 'date_suppression_demandee', type: 'timestamptz', nullable: true })
  dateSuppressionDemandee: Date | null;

  @OneToOne(() => ProfilUtilisateur, (profil) => profil.utilisateur, {
    cascade: true,
  })
  profil: ProfilUtilisateur;

  @OneToOne(() => ParametreConfidentialite, (param) => param.utilisateur, {
    cascade: true,
  })
  parametresConfidentialite: ParametreConfidentialite;

  @OneToMany(() => Consentement, (consentement) => consentement.utilisateur)
  consentements: Consentement[];

  @OneToMany(() => SessionAuthentification, (session) => session.utilisateur)
  sessions: SessionAuthentification[];
}
