import { IsEnum, IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { TypeConsentementEnum } from '../entities/consentement.entity';

export class CreateConsentDto {
  @IsEnum(TypeConsentementEnum, { message: 'Type de consentement invalide' })
  typeConsentement: TypeConsentementEnum;

  @IsString()
  @IsNotEmpty({ message: 'La version du document est obligatoire' })
  versionDocument: string;

  @IsBoolean()
  accepte: boolean;
}
