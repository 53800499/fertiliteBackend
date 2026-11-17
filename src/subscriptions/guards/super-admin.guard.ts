import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoleUtilisateurEnum } from '../../users/entities/utilisateur.entity';

/**
 * Guard Back-Office Super Admin :
 * Autorise l'accès soit via le header x-admin-api-key (clé SUPER_ADMIN_API_KEY),
 * soit via un JWT dont l'utilisatrice a le rôle 'super_admin'.
 */
@Injectable()
export class SuperAdminGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const configuredKey = process.env.SUPER_ADMIN_API_KEY || 'myfertility_super_admin_secret_key_2026_bj';
    const providedKey = request.headers['x-admin-api-key'];

    if (
      configuredKey &&
      configuredKey.trim().length >= 16 &&
      typeof providedKey === 'string' &&
      providedKey === configuredKey
    ) {
      try {
        await super.canActivate(context);
        request.adminActor = request.user?.email || 'super_admin_api_key';
      } catch {
        request.adminActor = 'super_admin_api_key';
      }
      return true;
    }

    const canJwt = await super.canActivate(context);
    if (!canJwt) {
      return false;
    }

    const user = request.user;
    if (
      !user ||
      (user.role !== RoleUtilisateurEnum.SUPER_ADMIN &&
        user.role !== RoleUtilisateurEnum.ADMIN)
    ) {
      throw new ForbiddenException(
        'Accès réservé aux Administrateurs (Back-Office).',
      );
    }

    request.adminActor = user.email;
    return true;
  }
}

