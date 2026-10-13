import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { ParametreConfidentialite } from './entities/parametre-confidentialite.entity';
import { Consentement } from './entities/consentement.entity';
import { SessionAuthentification } from '../auth/entities/session-authentification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParametreConfidentialite,
      Consentement,
      SessionAuthentification,
    ]),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
