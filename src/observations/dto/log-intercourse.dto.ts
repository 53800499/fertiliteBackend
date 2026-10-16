import {
  IsISO8601,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { TypeRapportEnum } from '../entities/observation-enums';

export class LogIntercourseDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty({ message: 'Le type de rapport est obligatoire' })
  @IsEnum(TypeRapportEnum, {
    message: 'Le type de rapport doit être protege ou non_protege',
  })
  typeRapport: TypeRapportEnum;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "L'heure doit être au format HH:mm ou HH:mm:ss",
  })
  heure?: string;

  @IsOptional()
  @IsBoolean()
  contraceptionUrgence?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
