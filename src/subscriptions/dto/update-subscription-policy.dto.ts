import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSubscriptionPolicyDto {
  @IsOptional()
  @IsBoolean({ message: 'exigenceAbonnementInitiale doit être un booléen.' })
  exigenceAbonnementInitiale?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'exigencePaywallsPremium doit être un booléen.' })
  exigencePaywallsPremium?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  messageRecommandation?: string;
}

