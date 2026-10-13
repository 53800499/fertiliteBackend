import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Le jeton de rafraîchissement est obligatoire' })
  refreshToken: string;
}
