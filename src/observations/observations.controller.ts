import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { LogTemperatureDto } from './dto/log-temperature.dto';
import { LogCervicalMucusDto } from './dto/log-cervical-mucus.dto';
import { LogLhTestDto } from './dto/log-lh-test.dto';
import { LogSymptomsDto } from './dto/log-symptoms.dto';
import { SaveDayObservationDto } from './dto/save-day-observation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('observations')
@UseGuards(JwtAuthGuard)
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  /**
   * Catalogue des symptômes actifs
   */
  @Get('symptoms/catalog')
  async getSymptomCatalog() {
    return this.observationsService.getSymptomCatalog();
  }

  /**
   * UC-16 : Enregistrement de la température basale
   */
  @Post('temperature')
  @HttpCode(HttpStatus.OK)
  async logTemperature(
    @CurrentUser() user: UserPayload,
    @Body() dto: LogTemperatureDto,
  ) {
    return this.observationsService.logTemperature(user.userId, dto);
  }

  /**
   * UC-17 : Enregistrement de la glaire cervicale
   */
  @Post('cervical-mucus')
  @HttpCode(HttpStatus.OK)
  async logCervicalMucus(
    @CurrentUser() user: UserPayload,
    @Body() dto: LogCervicalMucusDto,
  ) {
    return this.observationsService.logCervicalMucus(user.userId, dto);
  }

  /**
   * UC-18 : Enregistrement d'un test d'ovulation (LH)
   */
  @Post('lh-test')
  @HttpCode(HttpStatus.CREATED)
  async logLhTest(@CurrentUser() user: UserPayload, @Body() dto: LogLhTestDto) {
    return this.observationsService.logLhTest(user.userId, dto);
  }

  /**
   * UC-19 : Enregistrement d'un lot de symptômes
   */
  @Post('symptoms')
  @HttpCode(HttpStatus.OK)
  async logSymptoms(
    @CurrentUser() user: UserPayload,
    @Body() dto: LogSymptomsDto,
  ) {
    return this.observationsService.logSymptoms(user.userId, dto);
  }

  /**
   * Saisie unifiée d'une journée (UC-16 à UC-19 combinés)
   */
  @Post('day')
  @HttpCode(HttpStatus.OK)
  async saveDayObservation(
    @CurrentUser() user: UserPayload,
    @Body() dto: SaveDayObservationDto,
  ) {
    return this.observationsService.saveDayObservation(user.userId, dto);
  }

  /**
   * UC-12 : Détail des observations d'un jour donné
   */
  @Get('days/:date')
  async getDayObservations(
    @CurrentUser() user: UserPayload,
    @Param('date') date: string,
  ) {
    return this.observationsService.getDayObservations(user.userId, date);
  }

  /**
   * Historique des observations (avec filtrage de dates optionnel)
   */
  @Get('history')
  async getObservationsHistory(
    @CurrentUser() user: UserPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.observationsService.getObservationsHistory(
      user.userId,
      startDate,
      endDate,
    );
  }

  /**
   * Suppression unitaire de température
   */
  @Delete('temperature/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemperature(
    @CurrentUser() user: UserPayload,
    @Param('date') date: string,
  ) {
    await this.observationsService.deleteTemperature(user.userId, date);
  }

  /**
   * Suppression unitaire de glaire cervicale
   */
  @Delete('cervical-mucus/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCervicalMucus(
    @CurrentUser() user: UserPayload,
    @Param('date') date: string,
  ) {
    await this.observationsService.deleteCervicalMucus(user.userId, date);
  }

  /**
   * Suppression unitaire d'un test LH
   */
  @Delete('lh-test/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLhTest(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    await this.observationsService.deleteLhTest(user.userId, id);
  }

  /**
   * Suppression unitaire d'une observation de symptôme
   */
  @Delete('symptoms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSymptom(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    await this.observationsService.deleteSymptom(user.userId, id);
  }
}
