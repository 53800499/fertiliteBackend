import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminSupportService } from './admin-support.service';

@Controller('admin/tickets')
@UseGuards(SuperAdminGuard)
export class AdminSupportController {
  constructor(private readonly supportService: AdminSupportService) {}

  @Get()
  listTickets(@Query('status') status?: string) {
    return this.supportService.listTickets(status);
  }

  @Post()
  createTicket(@Body() body: any, @Req() req: any) {
    return this.supportService.createTicket(body, extractAdminActor(req));
  }

  @Patch(':id')
  updateTicket(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.supportService.updateTicket(id, body, extractAdminActor(req));
  }

  @Post(':id/reply')
  replyTicket(@Param('id') id: string, @Body('contenu') contenu: string, @Req() req: any) {
    return this.supportService.replyTicket(id, contenu, extractAdminActor(req));
  }
}

