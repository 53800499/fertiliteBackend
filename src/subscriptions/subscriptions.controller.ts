import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { ApplyReferralDto } from './dto/apply-referral.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

