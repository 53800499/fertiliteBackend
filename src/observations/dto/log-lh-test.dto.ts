import {
  IsISO8601,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ResultatTestLhEnum } from '../entities/observation-enums';

export class LogLhTestDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty({ message: 'Le résultat du test LH est obligatoire' })
  @IsEnum(ResultatTestLhEnum, {
    message: 'Résultat invalide (negatif, faible, positif, pic)',
  })
  resultat: ResultatTestLhEnum;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: "L'heure du test doit être au format HH:mm",
  })
  heureTest?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La valeur en mUI/mL doit être un nombre' })
  @Min(0, { message: 'La valeur minimale est 0 mUI/mL' })
  valeurMUiMl?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
