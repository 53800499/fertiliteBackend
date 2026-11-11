import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlanAbonnementEnum } from '../entities/abonnement.entity';

export enum MoyenPaiementFedaPayEnum {
  MTN = 'mtn',
  MOOV = 'moov',
  CELTIIS = 'celtiis',
  CARTE = 'carte',
  AUTO = 'auto',
}

export class InitiatePaymentDto {
  @IsEnum(PlanAbonnementEnum, {
    message: 'Le plan doit être "premium_mensuel" ou "premium_annuel".',
  })
  plan: PlanAbonnementEnum;

  @IsOptional()
  @IsString()
  moyenPaiement?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
