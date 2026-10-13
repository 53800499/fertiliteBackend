import {
  IsISO8601,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { StatutCycleEnum } from '../entities/cycle.entity';

export class UpdateCycleDto {
  @IsOptional()
  @IsISO8601()
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  dateFin?: string;

  @IsOptional()
  @IsEnum(StatutCycleEnum)
  statut?: StatutCycleEnum;
}
