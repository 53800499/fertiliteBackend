import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminCampaignsService } from './admin-campaigns.service';

@Controller('admin/campaigns')
@UseGuards(SuperAdminGuard)
export class AdminCampaignsController {
  constructor(private readonly campaignsService: AdminCampaignsService) {}

  @Get()
  listCampaigns() {
    return this.campaignsService.listCampaigns();
  }

  @Post()
  createCampaign(@Body() body: any, @Req() req: any) {
    return this.campaignsService.createCampaign(body, extractAdminActor(req));
  }

  @Post(':id/send')
  sendCampaign(@Param('id') id: string, @Req() req: any) {
    return this.campaignsService.sendCampaign(id, extractAdminActor(req));
  }
}

