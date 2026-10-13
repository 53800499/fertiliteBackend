import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategorieSymptomeEnum } from './observation-enums';

@Entity({ name: 'type_symptome' })
export class TypeSymptome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code', type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'nom', type: 'varchar', length: 100 })
  nom: string;

  @Column({
    name: 'categorie',
    type: 'enum',
    enum: CategorieSymptomeEnum,
  })
  categorie: CategorieSymptomeEnum;

  @Column({ name: 'icone', type: 'varchar', length: 50, nullable: true })
  icone: string | null;

  @Column({ name: 'actif', type: 'boolean', default: true })
  actif: boolean;

  @Column({ name: 'ordre_affichage', type: 'smallint', default: 0 })
  ordreAffichage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
