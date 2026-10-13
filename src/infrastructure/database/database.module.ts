import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Utilisateur } from '../../users/entities/utilisateur.entity';
import { ProfilUtilisateur } from '../../users/entities/profil-utilisateur.entity';
import { ParametreConfidentialite } from '../../privacy/entities/parametre-confidentialite.entity';
import { Consentement } from '../../privacy/entities/consentement.entity';
import { SessionAuthentification } from '../../auth/entities/session-authentification.entity';
import { Cycle } from '../../cycles/entities/cycle.entity';
import { JourRegles } from '../../cycles/entities/jour-regles.entity';
import { TemperatureBasale } from '../../observations/entities/temperature-basale.entity';
import { GlaireCervicale } from '../../observations/entities/glaire-cervicale.entity';
import { TestOvulation } from '../../observations/entities/test-ovulation.entity';
import { TypeSymptome } from '../../observations/entities/type-symptome.entity';
import { ObservationSymptome } from '../../observations/entities/observation-symptome.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USER', 'fertiuser'),
        password: configService.get<string>('DATABASE_PASSWORD', 'fertipass'),
        database: configService.get<string>('DATABASE_NAME', 'fertidb'),
        entities: [
          Utilisateur,
          ProfilUtilisateur,
          ParametreConfidentialite,
          Consentement,
          SessionAuthentification,
          Cycle,
          JourRegles,
          TemperatureBasale,
          GlaireCervicale,
          TestOvulation,
          TypeSymptome,
          ObservationSymptome,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Uniquement en dev
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
