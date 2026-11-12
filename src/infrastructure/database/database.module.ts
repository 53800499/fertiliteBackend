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
import { AdminAuditLog } from '../../super-admin/entities/admin-audit-log.entity';
import { HealthcareProfessional } from '../../super-admin/entities/healthcare-professional.entity';
import { EditorialContent } from '../../super-admin/entities/editorial-content.entity';
import { SubscriptionOffer } from '../../super-admin/entities/subscription-offer.entity';
import { PromoCode } from '../../super-admin/entities/promo-code.entity';
import { SupportTicket } from '../../super-admin/entities/support-ticket.entity';
import { NotificationCampaign } from '../../super-admin/entities/notification-campaign.entity';
import { PlatformSettings } from '../../super-admin/entities/platform-settings.entity';

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
            AdminAuditLog,
            HealthcareProfessional,
            EditorialContent,
            SubscriptionOffer,
            PromoCode,
            SupportTicket,
            NotificationCampaign,
            PlatformSettings,
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
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "admin_audit_log" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "actor_id" character varying(120),
          "actor_email" character varying(255) NOT NULL,
          "actor_role" character varying(50) NOT NULL DEFAULT 'super_admin',
          "module" character varying(100) NOT NULL,
          "action" character varying(120) NOT NULL,
          "target_type" character varying(80),
          "target_id" character varying(120),
          "details" jsonb,
          "ip_address" character varying(64),
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_admin_audit_log_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "professionnel_sante" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "nom_complet" character varying(160) NOT NULL,
          "specialite" character varying(50) NOT NULL DEFAULT 'gynecologue',
          "etablissement" character varying(180),
          "commune" character varying(100) NOT NULL DEFAULT 'Cotonou',
          "departement" character varying(100) NOT NULL DEFAULT 'Littoral',
          "telephone" character varying(40),
          "email" character varying(255),
          "numero_ordre" character varying(80),
          "statut_validation" character varying(40) NOT NULL DEFAULT 'en_attente',
          "diplome_verifie" boolean NOT NULL DEFAULT false,
          "note_moyenne" numeric(3,2) NOT NULL DEFAULT 4.80,
          "nb_evaluations" integer NOT NULL DEFAULT 0,
          "disponibilites" text,
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_professionnel_sante_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "contenu_editorial" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "titre" character varying(220) NOT NULL,
          "categorie" character varying(60) NOT NULL DEFAULT 'fertilite',
          "resume" text,
          "contenu" text NOT NULL,
          "image_url" character varying(500),
          "auteur" character varying(120) NOT NULL DEFAULT 'Équipe Médicale MyFertility',
          "statut" character varying(40) NOT NULL DEFAULT 'brouillon',
          "validation_medicale_requise" boolean NOT NULL DEFAULT true,
          "valide_par" character varying(160),
          "date_publication_programmee" TIMESTAMP WITH TIME ZONE,
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_contenu_editorial_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "offre_abonnement" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "code" character varying(60) NOT NULL UNIQUE,
          "nom" character varying(120) NOT NULL,
          "description" text,
          "prix" numeric(10,2) NOT NULL DEFAULT 0,
          "devise" character varying(10) NOT NULL DEFAULT 'XOF',
          "periode" character varying(40) NOT NULL DEFAULT 'mensuel',
          "duree_jours" integer NOT NULL DEFAULT 30,
          "essai_gratuit_jours" integer NOT NULL DEFAULT 0,
          "fonctionnalites" jsonb NOT NULL DEFAULT '[]',
          "actif" boolean NOT NULL DEFAULT true,
          "populaire" boolean NOT NULL DEFAULT false,
          "ordre_affichage" integer NOT NULL DEFAULT 0,
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_offre_abonnement_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "code_promo" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "code" character varying(40) NOT NULL UNIQUE,
          "description" character varying(200),
          "pourcentage_reduction" integer NOT NULL DEFAULT 0,
          "montant_fixe" numeric(10,2) NOT NULL DEFAULT 0,
          "utilisations_max" integer NOT NULL DEFAULT 100,
          "utilisations_actuelles" integer NOT NULL DEFAULT 0,
          "date_expiration" TIMESTAMP WITH TIME ZONE,
          "actif" boolean NOT NULL DEFAULT true,
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_code_promo_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "ticket_support" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "utilisateur_id" uuid,
          "utilisateur_email" character varying(255) NOT NULL,
          "sujet" character varying(200) NOT NULL,
          "categorie" character varying(60) NOT NULL DEFAULT 'compte',
          "priorite" character varying(40) NOT NULL DEFAULT 'normale',
          "statut" character varying(40) NOT NULL DEFAULT 'nouveau',
          "assigne_a" character varying(160),
          "messages" jsonb NOT NULL DEFAULT '[]',
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_ticket_support_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "campagne_notification" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "titre" character varying(200) NOT NULL,
          "canal" character varying(40) NOT NULL DEFAULT 'push',
          "segment" character varying(60) NOT NULL DEFAULT 'toutes',
          "message_prive" text NOT NULL,
          "statut" character varying(40) NOT NULL DEFAULT 'brouillon',
          "date_programmee" TIMESTAMP WITH TIME ZONE,
          "total_destinataires" integer NOT NULL DEFAULT 0,
          "total_lus" integer NOT NULL DEFAULT 0,
          "cree_par" character varying(160),
          "date_creation" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_campagne_notification_id" PRIMARY KEY ("id")
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "parametre_plateforme" (
          "id" character varying(32) NOT NULL DEFAULT 'global',
          "nom_plateforme" character varying(120) NOT NULL DEFAULT 'MyFertility',
          "email_contact" character varying(255) NOT NULL DEFAULT 'support@myfertility.bj',
          "telephone_support" character varying(40) NOT NULL DEFAULT '+229 01 90 00 00 00',
          "devise" character varying(10) NOT NULL DEFAULT 'XOF',
          "langues_disponibles" jsonb NOT NULL DEFAULT '["fr","en"]',
          "version_min_android" character varying(20) NOT NULL DEFAULT '1.0.0',
          "version_min_ios" character varying(20) NOT NULL DEFAULT '1.0.0',
          "mode_maintenance" boolean NOT NULL DEFAULT false,
          "message_maintenance" text,
          "cgu_version" character varying(30) NOT NULL DEFAULT '2026.1',
          "politique_version" character varying(30) NOT NULL DEFAULT '2026.1',
          "fournisseur_paiement_actif" character varying(40) NOT NULL DEFAULT 'fedapay',
          "date_maj" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_parametre_plateforme_id" PRIMARY KEY ("id")
        );
      `);
    } catch (error) {
      this.logger.warn(
        `Initialisation idempotente du schéma ignorée : ${(error as Error).message}`,
      );
    }
  }
}
