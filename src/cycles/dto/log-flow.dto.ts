import {
  IsISO8601,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsUUID,
} from 'class-validator';
import { IntensiteFluxEnum } from '../entities/jour-regles.entity';

export class LogFlowDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty({ message: 'L\'intensité du flux est obligatoire' })
  @IsEnum(IntensiteFluxEnum, { message: 'Intensité invalide (absent, spotting, leger, moyen, abondant)' })
  intensiteFlux: IntensiteFluxEnum;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  douleurNiveau?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
