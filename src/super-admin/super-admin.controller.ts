import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Header,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../subscriptions/guards/super-admin.guard';
import { SuperAdminService, AdminActor } from './super-admin.service';
import { StatutCompteEnum, RoleUtilisateurEnum } from '../users/entities/utilisateur.entity';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  private extractActor(req: any): AdminActor {
    return {
      id: req?.user?.userId,
      email: req?.adminActor || req?.user?.email || 'super_admin',
      role: req?.user?.role || 'super_admin',
      ip: req?.ip,
    };
  }

  // --- 1. Tableau de bord & Statistiques ---
  @Get('dashboard')
  getDashboard(@Query('period') period?: string) {
    return this.superAdminService.getDashboard(period);
  }

  @Get('analytics')
  getAnalytics(@Query('period') period?: string) {
    return this.superAdminService.getAdvancedAnalytics(period);
  }

  // --- 2. Utilisatrices ---
  @Get('users')
  listUsers(@Query('search') search?: string, @Query('status') status?: string) {
    return this.superAdminService.listUsers(search, status);
  }

  @Get('users/:id')
  getUserDetails(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.getUserAdministrativeDetails(id, this.extractActor(req));
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body('statutCompte') statutCompte: StatutCompteEnum,
    @Req() req: any,
  ) {
    return this.superAdminService.updateUserStatus(id, statutCompte, this.extractActor(req));
  }

  @Post('users/:id/revoke-sessions')
  revokeUserSessions(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.revokeUserSessions(id, this.extractActor(req));
  }

  // --- 3. Professionnels de santé ---
  @Get('professionals')
  listProfessionals(@Query('status') status?: string) {
    return this.superAdminService.listProfessionals(status);
  }

  @Post('professionals')
  createProfessional(@Body() body: any, @Req() req: any) {
    return this.superAdminService.createProfessional(body, this.extractActor(req));
  }

  @Patch('professionals/:id')
  updateProfessional(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.superAdminService.updateProfessional(id, body, this.extractActor(req));
  }

  @Delete('professionals/:id')
  deleteProfessional(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.deleteProfessional(id, this.extractActor(req));
  }

  // --- 4. Contenus & Ressources ---
  @Get('contents')
  listContents(@Query('status') status?: string) {
    return this.superAdminService.listContents(status);
  }

  @Post('contents')
  createContent(@Body() body: any, @Req() req: any) {
    return this.superAdminService.createContent(body, this.extractActor(req));
  }

  @Patch('contents/:id')
  updateContent(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.superAdminService.updateContent(id, body, this.extractActor(req));
  }

  @Post('contents/:id/validate-medical')
  validateContentMedically(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.validateContentMedically(id, this.extractActor(req));
  }

  @Delete('contents/:id')
  deleteContent(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.deleteContent(id, this.extractActor(req));
  }

  // --- 5. Offres & Promotions ---
  @Get('offers')
  listOffers() {
    return this.superAdminService.listOffers();
  }

  @Post('offers')
  upsertOffer(@Body() body: any, @Req() req: any) {
    return this.superAdminService.upsertOffer(body, this.extractActor(req));
  }

  @Get('promos')
  listPromos() {
    return this.superAdminService.listPromos();
  }

  @Post('promos')
  createPromo(@Body() body: any, @Req() req: any) {
    return this.superAdminService.createPromo(body, this.extractActor(req));
  }

  @Patch('promos/:id/toggle')
  togglePromo(@Param('id') id: string, @Body('actif') actif: boolean, @Req() req: any) {
    return this.superAdminService.togglePromo(id, actif, this.extractActor(req));
  }

  // --- 6. Paiements & Finances ---
  @Get('payments')
  listPayments(@Query('status') status?: string, @Query('provider') provider?: string) {
    return this.superAdminService.listPayments(status, provider);
  }

  @Post('payments/:id/reconcile')
  reconcilePayment(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.reconcilePayment(id, this.extractActor(req));
  }

  @Get('payments/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="myfertility-paiements.csv"')
  exportPaymentsCsv(@Req() req: any) {
    return this.superAdminService.exportPaymentsCsv(this.extractActor(req));
  }

  // --- 7. Notifications & Campagnes ---
  @Get('campaigns')
  listCampaigns() {
    return this.superAdminService.listCampaigns();
  }

  @Post('campaigns')
  createCampaign(@Body() body: any, @Req() req: any) {
    return this.superAdminService.createCampaign(body, this.extractActor(req));
  }

  @Post('campaigns/:id/send')
  sendCampaign(@Param('id') id: string, @Req() req: any) {
    return this.superAdminService.sendCampaign(id, this.extractActor(req));
  }

  // --- 8. Support & Réclamations ---
  @Get('tickets')
  listTickets(@Query('status') status?: string) {
    return this.superAdminService.listTickets(status);
  }

  @Post('tickets')
  createTicket(@Body() body: any, @Req() req: any) {
    return this.superAdminService.createTicket(body, this.extractActor(req));
  }

  @Patch('tickets/:id')
  updateTicket(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.superAdminService.updateTicket(id, body, this.extractActor(req));
  }

  @Post('tickets/:id/reply')
  replyTicket(@Param('id') id: string, @Body('contenu') contenu: string, @Req() req: any) {
    return this.superAdminService.replyTicket(id, contenu, this.extractActor(req));
  }

  // --- 9. Sécurité, RBAC, Audit & Consentements ---
  @Get('admins')
  listAdmins() {
    return this.superAdminService.listAdmins();
  }

  @Post('admins')
  createOrPromoteAdmin(
    @Body() body: { email: string; password?: string; role: RoleUtilisateurEnum },
    @Req() req: any,
  ) {
    return this.superAdminService.createOrPromoteAdmin(body, this.extractActor(req));
  }

  @Get('audit-logs')
  getAuditLogs(@Query('module') moduleFilter?: string) {
    return this.superAdminService.getAuditLogs(moduleFilter);
  }

  @Get('privacy/governance')
  getConsentGovernance() {
    return this.superAdminService.getConsentGovernance();
  }

  // --- 10 & 12. Paramètres Généraux & Surveillance Technique ---
  @Get('settings')
  getPlatformSettings() {
    return this.superAdminService.getPlatformSettings();
  }

  @Put('settings')
  updatePlatformSettings(@Body() body: any, @Req() req: any) {
    return this.superAdminService.updatePlatformSettings(body, this.extractActor(req));
  }

  @Get('monitoring/health')
  getSystemMonitoring() {
    return this.superAdminService.getSystemMonitoring();
  }
}

