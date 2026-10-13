import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Utilisateur } from '../../users/entities/utilisateur.entity';

export enum PlateformeEnum {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

@Entity('session_authentification')
export class SessionAuthentification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'utilisateur_id', type: 'uuid' })
  utilisateurId: string;

  @ManyToOne(() => Utilisateur, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'jeton_rafraichissement_hash', type: 'varchar', length: 255 })
  jetonRafraichissementHash: string;

  @Column({ name: 'nom_appareil', type: 'varchar', length: 150, nullable: true })
  nomAppareil: string | null;

  @Column({
    type: 'enum',
    enum: PlateformeEnum,
    nullable: true,
  })
  plateforme: PlateformeEnum | null;

  @Column({ name: 'adresse_ip', type: 'varchar', length: 45, nullable: true })
  adresseIp: string | null;

  @Column({ name: 'date_expiration', type: 'timestamptz' })
  dateExpiration: Date;

  @CreateDateColumn({ name: 'date_derniere_utilisation', type: 'timestamptz' })
  dateDerniereUtilisation: Date;

  @Column({ type: 'boolean', default: false })
  revoque: boolean;
}
