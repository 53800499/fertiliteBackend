import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.userId;

    if (!userId) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'Authentification et abonnement Premium requis.',
      });
    }

    const shouldRestrict = await this.subscriptionsService.shouldRestrictFreeUser(userId);
    if (shouldRestrict) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message:
          'Cette fonctionnalité avancée est réservée aux abonnées Premium Sérénité (1 000 XOF/mois ou 10 000 XOF/an).',
      });
    }

    return true;
  }
}

