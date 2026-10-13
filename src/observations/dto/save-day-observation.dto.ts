import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogTemperatureDto } from './log-temperature.dto';
import { LogCervicalMucusDto } from './log-cervical-mucus.dto';
import { LogLhTestDto } from './log-lh-test.dto';
import { SymptomItemDto } from './log-symptoms.dto';

export class SaveDayObservationDto {
  @IsNotEmpty({ message: 'La date est obligatoire' })
  @IsISO8601({}, { message: 'La date doit être au format ISO 8601 (YYYY-MM-DD)' })
  date: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogTemperatureDto)
  temperature?: LogTemperatureDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogCervicalMucusDto)
  glaire?: LogCervicalMucusDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LogLhTestDto)
  testLh?: LogLhTestDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SymptomItemDto)
  symptomes?: SymptomItemDto[];

  @IsOptional()
  @IsUUID()
  idClientLocal?: string;
}
