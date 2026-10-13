import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FertilityService } from './fertility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly fertilityService: FertilityService) {}

  /**
   * UC-11 : Vue Calendrier mensuel agrégée
   */
  @Get('month')
  async getMonthCalendar(
    @CurrentUser() user: UserPayload,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const now = new Date();
    const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new BadRequestException('Année ou mois invalide.');
    }

    return this.fertilityService.getMonthCalendar(user.userId, year, month);
  }

  /**
   * UC-12 : Détail clinique et prédictif complet pour une date donnée
   */
  @Get('days/:date')
  async getDayDetail(
    @CurrentUser() user: UserPayload,
    @Param('date') date: string,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Le format de date doit être YYYY-MM-DD');
    }

    return this.fertilityService.getDayDetail(user.userId, date);
  }
}
