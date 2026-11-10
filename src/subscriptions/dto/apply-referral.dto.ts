import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ApplyReferralDto {
  @IsNotEmpty({ message: 'Le code de parrainage est obligatoire.' })
  @IsString()
  @Length(4, 30, { message: 'Le format du code de parrainage est invalide.' })
  code: string;
}

