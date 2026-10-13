# 04 — Architecture Technique Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Architecture serveur NestJS
- **Pattern architectural** : **Modular Monolith** (Monolithe Modulaire Découplé)
- **Date** : 24 septembre 2026

---

## 1. Schéma d'Architecture Globale

Le backend est conçu selon le paradigme du **Modular Monolith**. Ce choix garantit :
- Une vélocité de développement maximale pour le MVP ;
- Une cohérence transactionnelle stricte grâce aux transactions ACID PostgreSQL ;
- Une isolation rigoureuse des modules évitant l'écueil du plat de spaghettis ;
- Une frontière nette autour du **Fertility Engine**, permettant son extraction sans douleur en service autonome (ex. microservice Python/FastAPI) si le volume de données ou les algorithmes ML l'exigent à terme.

```text
                                 ┌──────────────────────────┐
                                 │     Client Flutter       │
                                 │  (Mobile Android & iOS)  │
                                 └────────────┬─────────────┘
                                              │
                                     REST / HTTPS (JSON)
                                     JWT Bearer + TLS 1.3
                                              │
                                              ▼
                    ┌──────────────────────────────────────────────────┐
                    │               NestJS API Gateway                 │
                    │   Guards (JWT, RLS, Throttler) & Interceptors    │
                    └─────────────────────────┬────────────────────────┘
                                              │
        ┌─────────────────────────────────────┴─────────────────────────────────────┐
        │                                                                           │
        ▼                                                                           ▼
┌───────────────────────────────┐                                   ┌───────────────────────────────┐
│     Modules Opérationnels     │                                   │       Fertility Domain        │
│                               │                                   │                               │
│ • AuthModule                  │          Événements internes      │ • FertilityModule             │
│ • UsersModule                 │         (NestJS EventEmitter)     │   ├── engines/ (Calendar,     │
│ • CyclesModule                │──────────────────────────────────►│   │             Statistical)  │
│ • ObservationsModule          │                                   │   ├── predictors/             │
│ • NotificationsModule         │                                   │   └── confidence/             │
│ • PrivacyModule               │                                   └───────────────┬───────────────┘
│ • AnalyticsModule             │                                                   │
└───────────────┬───────────────┘                                                   │
                │                                                                   │
                │               Couche d'Accès aux Données (TypeORM)                │
                └─────────────────────────────┬─────────────────────────────────────┘
                                              │
                                              ▼
                                ┌───────────────────────────┐
                                │   PostgreSQL 15+ Engine   │
                                │                           │
                                │ • Row-Level Security (RLS)│
                                │ • Tables de Domaine       │
                                │ • Tables de Prédiction    │
                                │ • Registre des Versions   │
                                │ • Audit Append-Only       │
                                └───────────────────────────┘
```

---

## 2. Organisation Modulaire du Code Source (`src/`)

L'arborescence des sources respecte une séparation par domaine fonctionnel :

```text
src/
├── app.module.ts                         # Module racine assemblant l'ensemble des sous-modules
├── main.ts                               # Point d'entrée applicatif (Pipes, Swagger, Helmet, CORS)
│
├── common/                               # Utilitaires et composants transversaux
│   ├── decorators/                       # @CurrentUser(), @Public(), @RequireConsent()
│   ├── filters/                          # AllExceptionsFilter, HttpExceptionFilter
│   ├── guards/                           # JwtAuthGuard, RolesGuard, RlsContextGuard
│   ├── interceptors/                     # AuditAccessInterceptor, LoggingInterceptor, TransformInterceptor
│   └── pipes/                            # CustomValidationPipe, ParseUuidPipe
│
├── auth/                                 # Module d'Authentification & Sessions
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/                       # jwt.strategy.ts, local.strategy.ts
│   ├── guards/                           # local-auth.guard.ts, jwt-auth.guard.ts
│   ├── dto/                              # login.dto.ts, register.dto.ts, refresh-token.dto.ts
│   └── entities/                         # session-authentification.entity.ts
│
├── users/                                # Module Profils & Utilisatrices
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/                              # update-profile.dto.ts, delete-account.dto.ts
│   └── entities/                         # utilisateur.entity.ts, profil-utilisateur.entity.ts
│
├── cycles/                               # Module Gestion des Cycles & Menstruations
│   ├── cycles.controller.ts
│   ├── cycles.service.ts
│   ├── dto/                              # start-cycle.dto.ts, log-flow.dto.ts, update-cycle.dto.ts
│   ├── entities/                         # cycle.entity.ts, jour-regles.entity.ts
│   └── events/                           # cycle-started.event.ts, cycle-closed.event.ts
│
├── observations/                         # Module des Indicateurs Biologiques
│   ├── observations.controller.ts
│   ├── observations.service.ts
│   ├── dto/                              # log-temperature.dto.ts, log-mucus.dto.ts, log-lh.dto.ts
│   └── entities/                         # temperature-basale.entity.ts, glaire-cervicale.entity.ts, ...
│
├── fertility/                            # Cœur du Moteur d'Estimation (Isolé)
│   ├── fertility.controller.ts           # Endpoints d'estimation et restitution
│   ├── fertility.service.ts              # Orchestrateur d'estimation
│   ├── interfaces/
│   │   ├── fertility-estimator.interface.ts  # Contrat commun d'estimation
│   │   ├── fertility-input.interface.ts      # DTO d'entrée normalisé
│   │   └── fertility-output.interface.ts     # DTO de sortie standardisé
│   ├── engines/                          # Stratégies d'estimation (Design Pattern Strategy)
│   │   ├── calendar.engine.ts            # Niveau 1 : Algorithme calendaire historique
│   │   ├── statistical.engine.ts         # Niveau 2 : Modèle statistique multivarié
│   │   └── hybrid.engine.ts              # Orchestration dynamique selon complétude des données
│   ├── predictors/                       # Calculateurs spécialisés
│   │   ├── ovulation.predictor.ts        # Date d'ovulation + marge d'incertitude
│   │   └── fertile-window.predictor.ts   # Bornes début/fin de fenêtre fertile
│   ├── confidence/
│   │   └── confidence.service.ts         # Évaluation du niveau de confiance (faible/moyen/élevé)
│   ├── explanations/
│   │   └── explanation.service.ts        # Génération des facteurs explicatifs textuels
│   ├── dto/                              # recalculate-fertility.dto.ts, fertility-response.dto.ts
│   └── entities/                         # prediction.entity.ts, facteur-explicatif.entity.ts, ...
│
├── notifications/                        # Module Planification & Envoi des Alertes
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   ├── scheduler/                        # notification-scheduler.service.ts (Cron jobs)
│   ├── providers/                        # fcm.provider.ts, email.provider.ts
│   ├── dto/                              # notification-preferences.dto.ts
│   └── entities/                         # notification.entity.ts
│
├── privacy/                              # Module Confidentialité, Consentement & RGPD
│   ├── privacy.controller.ts
│   ├── privacy.service.ts
│   ├── consent/                          # consent.service.ts
│   ├── audit/                            # audit.service.ts (écriture journal_acces)
│   ├── data-export/                      # export.service.ts (portabilité des données en JSON)
│   └── entities/                         # parametre-confidentialite.entity.ts, consentement.entity.ts, journal-acces.entity.ts
│
├── analytics/                            # Module Tendances & Statistiques Cycles
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── entities/                         # statistique-cycle.entity.ts
│
└── infrastructure/                       # Couches basses techniques
    ├── database/                         # DatabaseModule, TypeORM configuration, RLS interceptor
    ├── cache/                            # CacheModule (Redis)
    └── jobs/                             # BullMQ queue pour tâches lourdes asynchrones
```

---

## 3. Communication Inter-Modules & Événements

Afin de préserver le découplage strict entre les modules opérationnels et le Fertility Engine, les communications asynchrones s'appuient sur le module d'événements de NestJS (`@nestjs/event-emitter`).

### Exemple de cycle de vie après une déclaration de règles :
1. `CyclesController` reçoit `POST /api/v1/cycles/start`.
2. `CyclesService` effectue la transaction de base de données (clôture cycle précédent + ouverture nouveau cycle).
3. `CyclesService` émet l'événement `new CycleStartedEvent(userId, cycleId)`.
4. `FertilityService` écoute l'événement via `@OnEvent('cycle.started')` :
   - Extrait les observations et cycles de l'utilisatrice ;
   - Exécute le calcul via l'implémentation active de `FertilityEstimator` ;
   - Persiste la nouvelle prédiction active ;
   - Émet l'événement `new PredictionUpdatedEvent(userId, predictionId)`.
5. `NotificationsService` écoute `prediction.updated` :
   - Reprogramme les dates de notification d'entrée en fenêtre fertile et de prévision des prochaines règles.

---

## 4. Sécurité & Contexte Multi-Tenant (RLS PostgreSQL)

Chaque requête authentifiée traverse l'intercepteur `RlsContextInterceptor`. Cet intercepteur positionne la variable de session PostgreSQL `app.utilisateur_id` sur la connexion réservée pour la requête :

```typescript
// Exemple conceptuel de l'intercepteur RLS NestJS
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.id) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      // Verrouillage de la session SQL sur l'UUID de l'utilisatrice authentifiée
      await queryRunner.query(`SET LOCAL app.utilisateur_id = '${user.id}'`);
      request['queryRunner'] = queryRunner;
    }
    return next.handle();
  }
}
```

Grâce à ce mécanisme, même si une requête SQL omettait par mégarde la clause `WHERE utilisateur_id = ...`, la politique de sécurité **PostgreSQL Row-Level Security** bloque physiquement l'accès à toute ligne appartenant à un autre compte.
