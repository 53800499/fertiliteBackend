import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { Cycle } from '../../cycles/entities/cycle.entity';
import { VersionMoteurPrediction } from './version-moteur-prediction.entity';
import { FacteurExplicatif } from './facteur-explicatif.entity';
import {
  CategorieFertiliteEnum,
  NiveauConfianceEnum,
  MethodePredictionEnum,
} from './fertility-enums';

@Entity('prediction')
export class Prediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'cycle_id', type: 'uuid', nullable: true })
  cycleId: string | null;

  @ManyToOne(() => Cycle, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle | null;

  @Column({ name: 'version_moteur_id', type: 'uuid' })
  versionMoteurId: string;

  @ManyToOne(() => VersionMoteurPrediction, (vm) => vm.predictions)
  @JoinColumn({ name: 'version_moteur_id' })
  versionMoteur: VersionMoteurPrediction;

  @CreateDateColumn({ name: 'date_generation', type: 'timestamptz' })
  dateGeneration: Date;

  @Column({ name: 'date_ovulation_estimee', type: 'date', nullable: true })
  dateOvulationEstimee: string | null;

  @Column({ name: 'marge_incertitude_jours', type: 'smallint', default: 2 })
  margeIncertitudeJours: number;

  @Column({ name: 'date_debut_fenetre_fertile', type: 'date', nullable: true })
  dateDebutFenetreFertile: string | null;

  @Column({ name: 'date_fin_fenetre_fertile', type: 'date', nullable: true })
  dateFinFenetreFertile: string | null;

  @Column({
    name: 'score_fertilite_categorie',
    type: 'enum',
    enum: CategorieFertiliteEnum,
    default: CategorieFertiliteEnum.FAIBLE,
  })
  scoreFertiliteCategorie: CategorieFertiliteEnum;

  @Column({
    name: 'score_fertilite_valeur',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  scoreFertiliteValeur: number;

  @Column({
    name: 'niveau_confiance',
    type: 'enum',
    enum: NiveauConfianceEnum,
    default: NiveauConfianceEnum.FAIBLE,
  })
  niveauConfiance: NiveauConfianceEnum;

  @Column({
    name: 'methode_utilisee',
    type: 'enum',
    enum: MethodePredictionEnum,
    default: MethodePredictionEnum.CALENDRIER_STATISTIQUE,
  })
  methodeUtilisee: MethodePredictionEnum;

  @Column({ name: 'est_active', type: 'boolean', default: true })
  estActive: boolean;

  @OneToMany(() => FacteurExplicatif, (facteur) => facteur.prediction, {
    cascade: true,
  })
  facteurs: FacteurExplicatif[];
}
