import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsISO8601,
} from 'class-validator';
import { ObjectifEnum } from '../entities/profil-utilisateur.entity';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsEnum(ObjectifEnum, { message: 'Objectif principal invalide' })
  objectifPrincipal?: ObjectifEnum;

  @IsOptional()
  @IsInt()
  @Min(15, { message: 'La durée de cycle minimale plausible est de 15 jours' })
  @Max(90, { message: 'La durée de cycle maximale plausible est de 90 jours' })
  dureeCycleHabituelleJours?: number;

  @IsOptional()
  @IsInt()
  dureeMoyenneCycle?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La durée des règles minimale est de 1 jour' })
  @Max(15, { message: 'La durée des règles maximale est de 15 jours' })
  dureeReglesHabituelleJours?: number;

  @IsOptional()
  @IsInt()
  dureeMoyenneRegles?: number;

  @IsOptional()
  @IsBoolean()
  irregulariteDeclaree?: boolean;

  @IsOptional()
  @IsISO8601({}, { message: 'La date des dernières règles doit être au format ISO 8601 (YYYY-MM-DD)' })
  dateDernieresReglesConnues?: string;
}
