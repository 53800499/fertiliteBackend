import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminSettingsService } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(SuperAdminGuard)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  getPlatformSettings() {
    return this.settingsService.getPlatformSettings();
  }

  @Put()
  updatePlatformSettings(@Body() body: any, @Req() req: any) {
    return this.settingsService.updatePlatformSettings(body, extractAdminActor(req));
  }
}

