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
import { AdminContentsService } from './admin-contents.service';

@Controller('admin/contents')
@UseGuards(SuperAdminGuard)
export class AdminContentsController {
  constructor(private readonly contentsService: AdminContentsService) {}

  @Get()
  listContents(@Query('status') status?: string) {
    return this.contentsService.listContents(status);
  }

  @Post()
  createContent(@Body() body: any, @Req() req: any) {
    return this.contentsService.createContent(body, extractAdminActor(req));
  }

  @Patch(':id')
  updateContent(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.contentsService.updateContent(id, body, extractAdminActor(req));
  }

  @Post(':id/validate-medical')
  validateContentMedically(@Param('id') id: string, @Req() req: any) {
    return this.contentsService.validateContentMedically(id, extractAdminActor(req));
  }

  @Delete(':id')
  deleteContent(@Param('id') id: string, @Req() req: any) {
    return this.contentsService.deleteContent(id, extractAdminActor(req));
  }
}

