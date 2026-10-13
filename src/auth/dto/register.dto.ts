import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsISO8601,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TypeConsentementEnum } from '../../privacy/entities/consentement.entity';

export class ConsentItemDto {
  @IsEnum(TypeConsentementEnum, {
    message: 'Type de consentement invalide',
  })
  type: TypeConsentementEnum;

  @IsString()
  @IsNotEmpty()
  version: string;

  @IsBoolean()
  accepted: boolean;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsISO8601({}, { message: 'La date de naissance doit être au format ISO 8601 (YYYY-MM-DD)' })
  birthDate: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsArray({ message: 'Les consentements doivent être fournis sous forme de liste' })
  @ValidateNested({ each: true })
  @Type(() => ConsentItemDto)
  consents: ConsentItemDto[];
}
