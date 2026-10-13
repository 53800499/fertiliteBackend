import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class LogTemperatureDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsNotEmpty({ message: 'La température est obligatoire' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La température doit être un nombre valide' })
  @Min(34.0, { message: 'La température minimale physiologique est de 34.0°C' })
  @Max(42.0, { message: 'La température maximale physiologique est de 42.0°C' })
  temperatureCelsius: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, {
    message: "L'heure de prise doit être au format HH:mm",
  })
  heurePrise?: string;

  @IsOptional()
  @IsBoolean()
  estPerturbee?: boolean;

  @IsOptional()
  @IsString()
  facteurPerturbateur?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
