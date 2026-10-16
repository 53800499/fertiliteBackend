# FertiliteApp — Backend NestJS & Fertility Engine

> **Composant API & Cœur d'estimation probabiliste de fertilité**  
> Développé avec **NestJS 10+**, **TypeScript**, **PostgreSQL 15+ / Supabase**, et **Docker**.

---

## 1. Architecture Modulaire

Le backend est architecturé selon le patron **Modular Monolith** :

```text
src/
├── auth/            # Authentification (Argon2id, JWT, Refresh tokens)
├── users/           # Gestion des comptes, profils et suppression
├── cycles/          # Suivi des cycles, règles et flux journaliers
├── observations/    # Température basale, glaire cervicale, tests LH, symptômes
├── fertility/       # Fertility Engine (Calendar, Statistical, Confidence, Explanations)
├── notifications/   # Planification & envois push FCM / emails
├── privacy/         # Consentements versionnés, audit trail, export RGPD
├── analytics/       # Snapshots statistiques de régularité et dispersion
└── infrastructure/  # PostgreSQL (RLS), TypeORM, Redis, BullMQ
```

Le **Fertility Engine** est découplé de la persistance via l'interface `FertilityEstimator`, permettant de basculer du moteur calendaire (Niveau 1) vers un modèle statistique (Niveau 2) puis vers un service de Machine Learning (Niveau 3) sans rupture.

---

## 2. Documentation Complète du Backend

Consultez le dossier [`doc/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc) pour les spécifications exhaustives :
- [01 — Document de Cadrage Backend](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/01-document-cadrage.md)
- [02 — Cahier des Charges Backend](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/02-cahier-des-charges.md)
- [03 — Spécifications Fonctionnelles (UC-01 à UC-26)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/03-specifications-fonctionnelles.md)
- [04 — Architecture Technique (Modular Monolith)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/04-architecture-technique.md)
- [05 — Cœur du Fertility Engine (Estimator Interface, Niveaux 1-3)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/05-specifications-techniques.md)
- [06 — Base de Données PostgreSQL (20 tables, 27 enums, RLS)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/06-base-de-donnees.md)
- [07 — Spécifications de l'API REST OpenAPI](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/07-api.md)
- [08 — Directives de Code & Conventions NestJS](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/08-documentation-code.md)
- [09 — Stratégie de Tests (Jest, Testcontainers, k6)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/09-tests.md)
- [10 — Déploiement & DevOps (Docker, CI/CD)](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/10-deploiement.md)
- [11 — Stratégie Data & Machine Learning](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/11-doc-strategie-.md)
- [12 — Spécifications Biologiques & Règles Métier](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/12-doc-fonctionnelles.md)
- Dossiers spécialisés : [`architecture/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/architecture), [`database/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/database), [`deployment/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/deployment), [`operations/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/operations), [`security/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/security), [`testing/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/testing), [`adr/`](file:///c:/Sikirou/eskay/FertiliteApp/FertiliteApp/backend/doc/adr).

---

## 3. Démarrage Rapide

### Prérequis
- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 15+

### Installation & Lancement en local
```bash
# 1. Cloner et installer les dépendances
cd backend
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Lancer PostgreSQL et Redis via Docker
docker-compose up -d postgres redis

# 4. Exécuter les migrations de schéma
npm run typeorm migration:run

# 5. Démarrer le serveur NestJS en mode développement
npm run start:dev
```

### Lancement des Tests
```bash
# Tests unitaires
npm run test

# Tests avec couverture de code
npm run test:cov

# Tests d'intégration et E2E
npm run test:e2e
```
