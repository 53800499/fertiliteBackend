import {
  Body,
  Controller,
  Delete,
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
import { AdminProfessionalsService } from './admin-professionals.service';

@Controller('admin/professionals')
@UseGuards(SuperAdminGuard)
export class AdminProfessionalsController {
  constructor(private readonly professionalsService: AdminProfessionalsService) {}

  @Get()
  listProfessionals(@Query('status') status?: string) {
    return this.professionalsService.listProfessionals(status);
  }

  @Post()
  createProfessional(@Body() body: any, @Req() req: any) {
    return this.professionalsService.createProfessional(body, extractAdminActor(req));
  }

  @Patch(':id')
  updateProfessional(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.professionalsService.updateProfessional(id, body, extractAdminActor(req));
  }

  @Delete(':id')
  deleteProfessional(@Param('id') id: string, @Req() req: any) {
    return this.professionalsService.deleteProfessional(id, extractAdminActor(req));
  }
}

