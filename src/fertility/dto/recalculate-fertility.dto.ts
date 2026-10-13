import { IsOptional, IsDateString } from 'class-validator';

export class RecalculateFertilityDto {
  @IsOptional()
  @IsDateString({}, { message: 'evaluationDate doit être au format YYYY-MM-DD' })
  evaluationDate?: string;
}
