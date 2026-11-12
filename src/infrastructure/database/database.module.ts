import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
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
import { RapportSexuel } from '../../observations/entities/rapport-sexuel.entity';
import { VersionMoteurPrediction } from '../../fertility/entities/version-moteur-prediction.entity';
import { Prediction } from '../../fertility/entities/prediction.entity';
import { FacteurExplicatif } from '../../fertility/entities/facteur-explicatif.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { PreferenceNotification } from '../../notifications/entities/preference-notification.entity';
import { Abonnement } from '../../subscriptions/entities/abonnement.entity';
import { Parrainage } from '../../subscriptions/entities/parrainage.entity';
import { AbonnementPolitique } from '../../subscriptions/entities/abonnement-politique.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const host = configService.get<string>('DATABASE_HOST', 'localhost');
        const isSsl =
          configService.get<string>('DATABASE_SSL') === 'true' ||
          (databaseUrl ? databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require') : false) ||
          host.includes('neon.tech');

        const sslOption = isSsl ? { rejectUnauthorized: false } : false;

        const commonConfig = {
          type: 'postgres' as const,
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
            RapportSexuel,
            VersionMoteurPrediction,
            Prediction,
            FacteurExplicatif,
            Notification,
            PreferenceNotification,
            Abonnement,
            Parrainage,
            AbonnementPolitique,
          ],
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production', // Uniquement en dev
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl: sslOption,
        };

        if (databaseUrl) {
          return {
            ...commonConfig,
            url: databaseUrl,
          };
        }

        return {
          ...commonConfig,
          host,
          port: configService.get<number>('DATABASE_PORT', 5432),
          username: configService.get<string>('DATABASE_USER', 'fertiuser'),
          password: configService.get<string>('DATABASE_PASSWORD', 'fertipass'),
          database: configService.get<string>('DATABASE_NAME', 'fertidb'),
        };
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query(`
        DO $$ BEGIN
          CREATE TYPE "public"."utilisateur_role_enum" AS ENUM('utilisatrice', 'admin', 'super_admin');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await this.dataSource.query(`
        ALTER TABLE "utilisateur"
        ADD COLUMN IF NOT EXISTS "role" "public"."utilisateur_role_enum" NOT NULL DEFAULT 'utilisatrice';
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "abonnement_politique" (
          "id" character varying(32) NOT NULL DEFAULT 'global',
          "exigence_abonnement_initiale" boolean NOT NULL DEFAULT false,
          "exigence_paywalls_premium" boolean NOT NULL DEFAULT true,
          "message_recommandation" text,
          "modifie_par" character varying(255),
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_abonnement_politique_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        INSERT INTO "abonnement_politique" (
          "id",
          "exigence_abonnement_initiale",
          "exigence_paywalls_premium",
          "message_recommandation"
        )
        VALUES (
          'global',
          false,
          true,
          'Activez Premium Sérénité (1 000 XOF/mois ou 10 000 XOF/an) pour débloquer l''analyse BBT, le bilan médical et l''historique illimité.'
        )
        ON CONFLICT ("id") DO NOTHING;
      `);
    } catch (error) {
      this.logger.warn(
        `Initialisation idempotente du schéma ignorée : ${(error as Error).message}`,
      );
    }
  }
}
