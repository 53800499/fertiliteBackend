import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FertilityService } from './fertility.service';
import { RecalculateFertilityDto } from './dto/recalculate-fertility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('fertility')
@UseGuards(JwtAuthGuard)
export class FertilityController {
  constructor(private readonly fertilityService: FertilityService) {}

  /**
   * UC-14 : Prédiction active courante
   */
  @Get('current')
  async getCurrentPrediction(@CurrentUser() user: UserPayload) {
    return this.fertilityService.getCurrentPrediction(user.userId);
  }

  /**
   * UC-15 : Facteurs explicatifs de la prédiction active
   */
  @Get('current/factors')
  async getCurrentFactors(@CurrentUser() user: UserPayload) {
    return this.fertilityService.getCurrentFactors(user.userId);
  }

  /**
   * UC-13 : Recalcul forcé de la fertilité
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculate(
    @CurrentUser() user: UserPayload,
    @Body() dto: RecalculateFertilityDto,
  ) {
    return this.fertilityService.calculateAndSavePrediction(
      user.userId,
      dto.evaluationDate,
    );
  }

  /**
   * Historique des prédictions passées
   */
  @Get('history')
  async getPredictionHistory(
    @CurrentUser() user: UserPayload,
    @Query('limit') limit?: number,
  ) {
    return this.fertilityService.getPredictionHistory(
      user.userId,
      limit ? Number(limit) : 10,
    );
  }
}
