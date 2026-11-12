import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { ApplyReferralDto } from './dto/apply-referral.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { UpdateSubscriptionPolicyDto } from './dto/update-subscription-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.getCurrentSubscription(user.userId);
  }

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @CurrentUser() user: UserPayload,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(user.userId, dto);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.cancelSubscription(user.userId);
  }

  // --- Endpoints Paiement FedaPay (Mobile Money & Cartes) ---

  @Post('payment/initiate')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @CurrentUser() user: UserPayload,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.subscriptionsService.initiatePayment(user.userId, dto);
  }

  @Post('payment/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @CurrentUser() user: UserPayload,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.subscriptionsService.verifyPayment(user.userId, dto.transactionId);
  }

  @Get('payment/verify/:transactionId')
  async verifyPaymentParam(
    @CurrentUser() user: UserPayload,
    @Param('transactionId') transactionId: string,
  ) {
    return this.subscriptionsService.verifyPayment(user.userId, transactionId);
  }

  // --- Endpoints Parrainage intégrés ---

  @Get('referral/info')
  async getReferralInfo(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.getReferralInfo(user.userId);
  }

  @Post('referral/apply')
  @HttpCode(HttpStatus.OK)
  async applyReferral(
    @CurrentUser() user: UserPayload,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.subscriptionsService.applyReferralCode(user.userId, dto);
  }

  @Get('referral/history')
  async getReferralHistory(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.getReferralHistory(user.userId);
  }
}

/**
 * Controller public pour les webhooks FedaPay (aucun token JWT utilisateur requis)
 */
@Controller('subscriptions/payment')
export class SubscriptionWebhookController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('fedapay-webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    return this.subscriptionsService.handleFedaPayWebhook(payload);
  }

  @Get('fedapay-webhook')
  @Header('Content-Type', 'text/html; charset=utf-8')
  handleWebhookBrowserReturn(
    @Query('id') id?: string,
    @Query('status') status?: string,
  ): string {
    return this.buildCheckoutReturnHtml(id, status);
  }

  @Get('fedapay-callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  handleCheckoutCallback(
    @Query('id') id?: string,
    @Query('status') status?: string,
  ): string {
    return this.buildCheckoutReturnHtml(id, status);
  }

  private buildCheckoutReturnHtml(id?: string, status?: string): string {
    const safeStatus = (status || 'pending').replace(/[^a-zA-Z0-9_-]/g, '');
    const safeId = (id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const isApproved = safeStatus.toLowerCase() === 'approved';
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FertiliteApp - Retour Paiement FedaPay</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #FFF7F9; color: #1F2937; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { max-width: 420px; width: 100%; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); text-align: center; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; background: ${isApproved ? '#ECFDF5' : '#FEF3C7'}; color: ${isApproved ? '#047857' : '#B45309'}; }
    h1 { font-size: 20px; margin: 16px 0 8px; }
    p { font-size: 14px; line-height: 1.5; color: #4B5563; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isApproved ? 'Paiement validé' : 'Retour FedaPay'}</div>
    <h1>Retournez dans FertiliteApp</h1>
    <p>Vous pouvez fermer cette page et appuyer sur <strong>« Vérifier mon paiement »</strong> dans l'application pour activer immédiatement votre abonnement Premium.</p>
    ${safeId ? `<p style="font-size:12px;color:#6B7280;">Référence : ${safeId}</p>` : ''}
  </div>
</body>
</html>`;
  }
}

/**
 * Contrôleur public exposant la politique d'abonnement définie par le Super Admin.
 */
@Controller('subscriptions')
export class SubscriptionPolicyController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('policy')
  async getPolicy() {
    return this.subscriptionsService.getSubscriptionPolicy();
  }
}

/**
 * Contrôleur Back-Office Super Admin pour activer/désactiver l'exigence d'abonnement.
 */
@Controller('admin/subscriptions')
@UseGuards(SuperAdminGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('policy')
  async getAdminPolicy() {
    return this.subscriptionsService.getSubscriptionPolicy();
  }

  @Put('policy')
  async putAdminPolicy(
    @Body() dto: UpdateSubscriptionPolicyDto,
    @Req() req: any,
  ) {
    return this.subscriptionsService.updateSubscriptionPolicy(dto, req?.adminActor);
  }

  @Patch('policy')
  async patchAdminPolicy(
    @Body() dto: UpdateSubscriptionPolicyDto,
    @Req() req: any,
  ) {
    return this.subscriptionsService.updateSubscriptionPolicy(dto, req?.adminActor);
  }
}

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('my-code')
  async getMyCode(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.getReferralInfo(user.userId);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async applyReferral(
    @CurrentUser() user: UserPayload,
    @Body() dto: ApplyReferralDto,
  ) {
    return this.subscriptionsService.applyReferralCode(user.userId, dto);
  }

  @Get('history')
  async getHistory(@CurrentUser() user: UserPayload) {
    return this.subscriptionsService.getReferralHistory(user.userId);
  }
}

