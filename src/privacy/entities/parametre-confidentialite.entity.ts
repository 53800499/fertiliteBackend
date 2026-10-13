import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

@Entity('parametre_confidentialite')
export class ParametreConfidentialite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid', unique: true })
  utilisateurId: string;

  @OneToOne(() => Utilisateur, (user) => user.parametresConfidentialite, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'partage_donnees_recherche', type: 'boolean', default: false })
  partageDonneesRecherche: boolean;

  @Column({ name: 'notifications_activees', type: 'boolean', default: true })
  notificationsActivees: boolean;

  @Column({ name: 'verrouillage_biometrique', type: 'boolean', default: false })
  verrouillageBiometrique: boolean;

  @Column({ name: 'masquage_donnees_sensibles', type: 'boolean', default: false })
  masquageDonneesSensibles: boolean;
}
