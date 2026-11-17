import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../../subscriptions/guards/super-admin.guard';
import { RoleUtilisateurEnum } from '../../users/entities/utilisateur.entity';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminSecurityService } from './admin-security.service';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminSecurityController {
  constructor(private readonly securityService: AdminSecurityService) {}

  @Get('admins')
  listAdmins() {
    return this.securityService.listAdmins();
  }

  @Post('admins')
  createOrPromoteAdmin(
    @Body() body: { email: string; password?: string; role: RoleUtilisateurEnum },
    @Req() req: any,
  ) {
    return this.securityService.createOrPromoteAdmin(body, extractAdminActor(req));
  }

  @Delete('admins/:id')
  demoteAdmin(@Param('id') id: string, @Req() req: any) {
    return this.securityService.demoteAdmin(id, extractAdminActor(req));
  }

  @Get('audit-logs')
  getAuditLogs(@Query('module') moduleFilter?: string) {
    return this.securityService.getAuditLogs(moduleFilter);
  }

  @Get('privacy/governance')
  getConsentGovernance() {
    return this.securityService.getConsentGovernance();
  }

  @Delete('privacy/purge/:id')
  purgeGdprUser(@Param('id') id: string, @Req() req: any) {
    return this.securityService.purgeGdprUser(id, extractAdminActor(req));
  }
}

