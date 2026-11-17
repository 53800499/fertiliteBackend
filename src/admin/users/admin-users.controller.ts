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
import { RoleUtilisateurEnum, StatutCompteEnum } from '../../users/entities/utilisateur.entity';
import { PlanAbonnementEnum } from '../../subscriptions/entities/abonnement.entity';
import { extractAdminActor } from '../shared/admin-actor.helper';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(SuperAdminGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  listUsers(@Query('search') search?: string, @Query('status') status?: string) {
    return this.usersService.listUsers(search, status);
  }

  @Get(':id')
  getUserDetails(@Param('id') id: string, @Req() req: any) {
    return this.usersService.getUserAdministrativeDetails(id, extractAdminActor(req));
  }

  @Patch(':id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body('statutCompte') statutCompte: StatutCompteEnum,
    @Req() req: any,
  ) {
    return this.usersService.updateUserStatus(id, statutCompte, extractAdminActor(req));
  }

  @Patch(':id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: RoleUtilisateurEnum,
    @Req() req: any,
  ) {
    return this.usersService.updateUserRole(id, role, extractAdminActor(req));
  }

  @Post(':id/grant-subscription')
  grantUserSubscription(
    @Param('id') id: string,
    @Body('plan') plan: PlanAbonnementEnum,
    @Body('durationDays') durationDays: number,
    @Req() req: any,
  ) {
    return this.usersService.grantUserSubscription(id, plan, durationDays || 30, extractAdminActor(req));
  }

  @Post(':id/revoke-sessions')
  revokeUserSessions(@Param('id') id: string, @Req() req: any) {
    return this.usersService.revokeUserSessions(id, extractAdminActor(req));
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.usersService.deleteUser(id, extractAdminActor(req));
  }
}

