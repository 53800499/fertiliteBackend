import {
  IsISO8601,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TypeGlaireEnum } from '../entities/observation-enums';

export class LogCervicalMucusDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty({ message: 'Le type de glaire est obligatoire' })
  @IsEnum(TypeGlaireEnum, {
    message: 'Type de glaire invalide (sec, collant, cremeux, filant_blanc_oeuf, aqueux)',
  })
  typeGlaire: TypeGlaireEnum;

  @IsOptional()
  @IsString()
  quantite?: string;

  @IsOptional()
  @IsString()
  sensation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
