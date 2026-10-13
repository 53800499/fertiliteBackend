import { CategorieFertiliteEnum } from '../entities/fertility-enums';

export interface CalendarDaySummaryDto {
  date: string; // YYYY-MM-DD
  isPeriodDay: boolean;
  flowIntensity?: string | null;
  painLevel?: number | null;
  isFertileDay: boolean;
  isOvulationDay: boolean;
  fertilityCategory?: CategorieFertiliteEnum;
  fertilityScore?: number;
  hasObservations: boolean;
}

export interface CalendarMonthResponseDto {
  year: number;
  month: number;
  activeCycleId?: string | null;
  estimatedOvulationDate?: string | null;
  fertileWindowStartDate?: string | null;
  fertileWindowEndDate?: string | null;
  days: CalendarDaySummaryDto[];
}
