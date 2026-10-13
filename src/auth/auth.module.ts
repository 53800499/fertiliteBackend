import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Utilisateur } from '../users/entities/utilisateur.entity';
import { ProfilUtilisateur } from '../users/entities/profil-utilisateur.entity';
import { ParametreConfidentialite } from '../privacy/entities/parametre-confidentialite.entity';
import { Consentement } from '../privacy/entities/consentement.entity';
import { SessionAuthentification } from './entities/session-authentification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utilisateur,
      ProfilUtilisateur,
      ParametreConfidentialite,
      Consentement,
      SessionAuthentification,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'super_secret_jwt_key_default'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
