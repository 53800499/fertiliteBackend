import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { StartCycleDto } from './dto/start-cycle.dto';
import { LogFlowDto } from './dto/log-flow.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('cycles')
@UseGuards(JwtAuthGuard)
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  /**
   * UC-07 : Démarrer un nouveau cycle
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startCycle(@CurrentUser() user: UserPayload, @Body() dto: StartCycleDto) {
    return this.cyclesService.startCycle(user.userId, dto);
  }

  /**
   * UC-08 : Saisie quotidienne du flux
   */
  @Post('days')
  @HttpCode(HttpStatus.OK)
  async logDayFlow(@CurrentUser() user: UserPayload, @Body() dto: LogFlowDto) {
    return this.cyclesService.logDayFlow(user.userId, dto);
  }

  /**
   * UC-10 : Historique des cycles
   */
  @Get()
  async getCycles(@CurrentUser() user: UserPayload) {
    return this.cyclesService.getCycles(user.userId);
  }

  /**
   * Cycle en cours actif
   */
  @Get('active')
  async getActiveCycle(@CurrentUser() user: UserPayload) {
    return this.cyclesService.getActiveCycle(user.userId);
  }

  /**
   * UC-23 : Statistiques et régularité des cycles
   */
  @Get('stats')
  async getCycleStats(@CurrentUser() user: UserPayload) {
    return this.cyclesService.getCycleStats(user.userId);
  }

  /**
   * Détail d'un cycle
   */
  @Get(':id')
  async getCycleById(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.cyclesService.getCycleById(user.userId, id);
  }

  /**
   * UC-09 : Modifier un cycle passé
   */
  @Put(':id')
  async updateCycle(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCycleDto,
  ) {
    return this.cyclesService.updateCycle(user.userId, id, dto);
  }

  /**
   * Supprimer un cycle
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCycle(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    await this.cyclesService.deleteCycle(user.userId, id);
  }
}

