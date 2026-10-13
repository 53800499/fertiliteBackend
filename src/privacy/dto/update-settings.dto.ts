import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  partageDonneesRecherche?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationsActivees?: boolean;

  @IsOptional()
  @IsBoolean()
  verrouillageBiometrique?: boolean;

  @IsOptional()
  @IsBoolean()
  masquageDonneesSensibles?: boolean;
}
