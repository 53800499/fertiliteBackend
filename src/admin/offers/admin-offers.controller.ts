import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminOffersService } from './admin-offers.service';

@Controller('admin/offers')
@UseGuards(SuperAdminGuard)
export class AdminOffersController {
  constructor(private readonly offersService: AdminOffersService) {}

  @Get()
  listOffers() {
    return this.offersService.listOffers();
  }

  @Post()
  upsertOffer(@Body() body: any, @Req() req: any) {
    return this.offersService.upsertOffer(body, extractAdminActor(req));
  }
}

