import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrivacyService } from './privacy.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('settings')
  async getSettings(@CurrentUser() user: UserPayload) {
    return this.privacyService.getSettings(user.userId);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: UserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.privacyService.updateSettings(user.userId, dto);
  }

  @Get('consents')
  async getConsents(@CurrentUser() user: UserPayload) {
    return this.privacyService.getConsents(user.userId);
  }

  @Post('consents')
  async recordConsent(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateConsentDto,
    @Req() req: Request,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress;
    return this.privacyService.recordConsent(user.userId, dto, clientIp);
  }

  @Get('sessions')
  async getActiveSessions(@CurrentUser() user: UserPayload) {
    return this.privacyService.getActiveSessions(user.userId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser() user: UserPayload,
    @Param('id') sessionId: string,
  ) {
    return this.privacyService.revokeSession(user.userId, sessionId);
  }
}
