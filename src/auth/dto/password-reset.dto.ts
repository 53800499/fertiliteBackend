import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Adresse email requise' })
  email: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  resetToken?: string;

  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
  newPassword: string;
}
