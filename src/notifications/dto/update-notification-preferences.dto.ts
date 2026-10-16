import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  rappelSaisieActif?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "L'heure de rappel doit être au format HH:mm (ex: 20:30)",
  })
  heureRappelSaisie?: string;

  @IsOptional()
  @IsBoolean()
  alerteFenetreFertile?: boolean;

  @IsOptional()
  @IsBoolean()
  alerteReglesPrevues?: boolean;

  @IsOptional()
  @IsBoolean()
  canalPush?: boolean;

  @IsOptional()
  @IsBoolean()
  canalEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  canalInApp?: boolean;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}
