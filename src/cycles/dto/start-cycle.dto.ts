import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  IsUUID,
} from 'class-validator';
import { SourceSaisieEnum } from '../entities/cycle.entity';
import { IntensiteFluxEnum } from '../entities/jour-regles.entity';

export class StartCycleDto {
  @IsNotEmpty({ message: 'La date de début du cycle est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  dateDebut: string;

  @IsOptional()
  @IsEnum(SourceSaisieEnum)
  sourceSaisie?: SourceSaisieEnum;

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
  @IsUUID()
  idClientLocal?: string;
}
