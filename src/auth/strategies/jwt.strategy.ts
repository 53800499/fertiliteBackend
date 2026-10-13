import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur, StatutCompteEnum } from '../../users/entities/utilisateur.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Utilisateur)
    private readonly utilisateurRepo: Repository<Utilisateur>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_default'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.utilisateurRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.statutCompte === StatutCompteEnum.SUPPRIME) {
      throw new UnauthorizedException('Utilisatrice introuvable ou compte désactivé');
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }
}
