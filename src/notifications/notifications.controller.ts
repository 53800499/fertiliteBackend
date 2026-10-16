import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Consultation de la boîte de réception des notifications
   */
  @Get()
  async getNotifications(@CurrentUser() user: UserPayload) {
    return this.notificationsService.getNotifications(user.userId);
  }

  /**
   * UC-22: Lecture des préférences de notifications
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: UserPayload) {
    return this.notificationsService.getPreferences(user.userId);
  }

  /**
   * UC-22: Modification des préférences de notifications
   */
  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.userId, dto);
  }

  /**
   * Marquage d'une notification comme lue
   */
  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  /**
   * Marquage de toutes les notifications comme lues
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: UserPayload) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  /**
   * Déclenchement d'une notification de test en direct
   */
  @Post('test')
  @HttpCode(HttpStatus.CREATED)
  async sendTestNotification(@CurrentUser() user: UserPayload) {
    return this.notificationsService.sendTestNotification(user.userId);
  }

  /**
   * Déclenchement de l'évaluation des rappels physiologiques (UC-20, UC-21)
   */
  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateReminders(@CurrentUser() user: UserPayload) {
    return this.notificationsService.evaluateReminders(user.userId);
  }
}
