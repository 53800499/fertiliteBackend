import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { PlateformeEnum } from '../entities/session-authentification.entity';

export class LoginDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  password: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsEnum(PlateformeEnum, { message: 'Plateforme invalide (android, ios, web)' })
  platform?: PlateformeEnum;
}
