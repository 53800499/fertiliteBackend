import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntensiteFluxEnum } from '../entities/jour-regles.entity';

export class CreatePastCycleDto {
  @IsNotEmpty({ message: 'La date de début du cycle est obligatoire' })
  @IsISO8601({}, { message: 'La date de début doit être au format ISO 8601 (YYYY-MM-DD)' })
  dateDebut: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La date de fin doit être au format ISO 8601 (YYYY-MM-DD)' })
  dateFin?: string;

  @IsOptional()
  @IsInt()
  @Min(15, { message: 'La durée du cycle doit être d\'au moins 15 jours' })
  @Max(90, { message: 'La durée du cycle ne peut pas excéder 90 jours' })
  dureeCycleJours?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'La durée des règles doit être d\'au moins 1 jour' })
  @Max(15, { message: 'La durée des règles ne peut pas excéder 15 jours' })
  dureeReglesJours?: number;

  @IsOptional()
  @IsEnum(IntensiteFluxEnum)
  intensiteFlux?: IntensiteFluxEnum;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  douleurNiveau?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  estCycleActuel?: boolean;
}

export class CreateMultiplePastCyclesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePastCycleDto)
  cycles: CreatePastCycleDto[];
}

