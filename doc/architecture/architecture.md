# Architecture Technique Détaillée — Backend NestJS
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Modèle C4 — Niveau Conteneurs (Container Diagram)

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              FERTILITEAPP                              │
 │                                                                        │
 │  ┌─────────────────────────┐               ┌────────────────────────┐  │
 │  │      Client Mobile      │               │   PostgreSQL Engine    │  │
 │  │         Flutter         │               │     15+ / Supabase     │  │
 │  │    (Android & iOS)      │               │                        │  │
 │  └────────────┬────────────┘               │ • Tables de Domaine    │  │
 │               │                            │ • Row-Level Security   │  │
 │               │ REST / HTTPS               │ • Append-only Audit    │  │
 │               │ JWT Bearer                 └───────────▲────────────┘  │
 │               ▼                                        │               │
 │  ┌─────────────────────────────────────────────────────┴────────────┐  │
 │  │                         NestJS API Server                        │  │
 │  │                                                                  │  │
 │  │  ┌───────────────────────┐             ┌──────────────────────┐  │  │
 │  │  │  Operational Modules  │             │   Fertility Engine   │  │  │
 │  │  │                       │ Event Bus   │                      │  │  │
 │  │  │ • AuthModule          │────────────►│ • CalendarEngine     │  │  │
 │  │  │ • CyclesModule        │             │ • StatisticalEngine  │  │  │
 │  │  │ • ObservationsModule  │             │ • ConfidenceService  │  │  │
 │  │  │ • PrivacyModule       │             │ • ExplanationService │  │  │
 │  │  └───────────────────────┘             └──────────────────────┘  │  │
 │  │              │                                     │             │  │
 │  │              └──────────────────┬──────────────────┘             │  │
 │  │                                 │ TypeORM / SQL                  │  │
 │  └─────────────────────────────────┼────────────────────────────────┘  │
 │                                    ▼                                   │
 │                       ┌─────────────────────────┐                      │
 │                       │       Redis Cache       │                      │
 │                       │  (Sessions & BullMQ)    │                      │
 │                       └─────────────────────────┘                      │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Principes d'Isolation & Découplage

1. **Absence de dépendances circulaires** : Chaque module de domaine est autonome. Le module `cycles` ne connaît pas le module `fertility` ; il émet un événement `CycleStartedEvent` consommé de manière asynchrone par `FertilityModule`.
2. **Couche d'Accès aux Données Abstraite** : Les entités TypeORM encapsulent les contraintes de base sans mélanger les règles de gestion avec la persistance.
3. **Stateless API** : Le serveur NestJS est totalement sans état (stateless) ; les sessions sont validées par signature cryptographique JWT, facilitant la mise à l'échelle horizontale (scaling).
