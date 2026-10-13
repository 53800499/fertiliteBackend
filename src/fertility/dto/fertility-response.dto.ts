import {
  CategorieFertiliteEnum,
  NiveauConfianceEnum,
  MethodePredictionEnum,
  TypeFacteurEnum,
  SensEffetEnum,
} from '../entities/fertility-enums';

export interface FactorResponseDto {
  id?: string;
  type: TypeFacteurEnum;
  description: string;
  weight: number;
  direction: SensEffetEnum;
  displayOrder: number;
}

export interface FertileWindowDto {
  startDate: string;
  endDate: string;
}

export interface FertilityPredictionResponseDto {
  predictionId: string;
  generationDate: Date;
  estimatedOvulationDate: string | null;
  uncertaintyMarginDays: number;
  fertileWindow: FertileWindowDto;
  fertilityCategory: CategorieFertiliteEnum;
  fertilityScoreValue: number;
  confidenceLevel: NiveauConfianceEnum;
  method: MethodePredictionEnum;
  algorithm: string;
  modelVersion: string;
  factors: FactorResponseDto[];
}
