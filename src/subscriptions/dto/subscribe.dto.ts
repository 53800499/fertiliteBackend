import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { PlanAbonnementEnum } from '../entities/abonnement.entity';

export class SubscribeDto {
  @IsNotEmpty({ message: 'Le plan d\'abonnement est obligatoire.' })
  @IsEnum(PlanAbonnementEnum, {
    message: 'Le plan doit être "premium_mensuel" ou "premium_annuel".',
  })
  plan: PlanAbonnementEnum;

  @IsOptional()
  @IsString()
  fournisseur?: string;

  @IsOptional()
  @IsString()
  referenceTransaction?: string;

  @IsOptional()
  @IsNumber()
  montant?: number;

  @IsOptional()
  @IsString()
  devise?: string;
}

