import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminPromotionsService } from './admin-promotions.service';

@Controller('admin/promos')
@UseGuards(SuperAdminGuard)
export class AdminPromotionsController {
  constructor(private readonly promotionsService: AdminPromotionsService) {}

  @Get()
  listPromos() {
    return this.promotionsService.listPromos();
  }

  @Post()
  createPromo(@Body() body: any, @Req() req: any) {
    return this.promotionsService.createPromo(body, extractAdminActor(req));
  }

  @Patch(':id/toggle')
  togglePromo(@Param('id') id: string, @Body('actif') actif: boolean, @Req() req: any) {
    return this.promotionsService.togglePromo(id, actif, extractAdminActor(req));
  }
}

