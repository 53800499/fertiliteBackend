import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Req,
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

