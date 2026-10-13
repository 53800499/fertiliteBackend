import {
  IsISO8601,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SymptomItemDto {
  @IsNotEmpty({ message: 'Le code ou identifiant du symptôme est obligatoire' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: "L'intensité est obligatoire" })
  @IsInt()
  @Min(1, { message: "L'intensité minimale est de 1" })
  @Max(5, { message: "L'intensité maximale est de 5" })
  intensite: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogSymptomsDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsArray({ message: 'La liste des symptômes doit être un tableau' })
  @ValidateNested({ each: true })
  @Type(() => SymptomItemDto)
  symptomes: SymptomItemDto[];

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
