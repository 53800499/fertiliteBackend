# 10 — Déploiement & DevOps Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Pipeline de conteneurisation, CI/CD et déploiement cloud
- **Technologies** : Docker, GitHub Actions, PostgreSQL / Supabase, Redis
- **Date** : 24 septembre 2026

---

## 1. Conteneurisation Multi-Stage (`Dockerfile`)

Pour garantir un conteneur de production minimaliste, sécurisé et exécuté avec un utilisateur non-root :

```dockerfile
# Étape 1 : Build
FROM node:20-alpine AS builder
WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm ci

# Compilation TypeScript
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# Élagage des dépendances de dev
RUN npm prune --production

# Étape 2 : Runtime de Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Sécurité : utilisateur non-root
USER node

# Copie des artefacts nécessaires
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 2. Environnement Local Complet (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    command: npm run start:dev
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DATABASE_URL=postgresql://fertiuser:fertipass@postgres:5432/fertidb
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=super_secret_jwt_key_local_dev_only
      - JWT_REFRESH_SECRET=super_secret_refresh_key_local_dev_only
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: fertidb
      POSTGRES_USER: fertiuser
      POSTGRES_PASSWORD: fertipass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fertiuser -d fertidb"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 3. Pipeline CI/CD (GitHub Actions)

Fichier `.github/workflows/backend-ci-cd.yml` :

```yaml
name: Backend CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Linter & Format check
        working-directory: ./backend
        run: npm run lint

      - name: TypeScript Compile check
        working-directory: ./backend
        run: npx tsc --noEmit

      - name: Unit Tests
        working-directory: ./backend
        run: npm run test:cov

      - name: Integration Tests (Testcontainers)
        working-directory: ./backend
        run: npm run test:e2e

  deploy-staging:
    needs: validate
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Build & Push Docker image
        run: echo "Déploiement automatique sur environnement Staging"

  deploy-prod:
    needs: validate
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Build & Push Docker image
        run: echo "Déploiement sécurisé avec approbation sur environnement Production"
```

---

## 4. Gestion des Migrations de Base de Données

Les évolutions de schéma sont exclusivement pilotées par des fichiers de migration versionnés :
- Interdiction de l'option `synchronize: true` de TypeORM en production ;
- Exécution des migrations lors du déploiement via un init-container ou une tâche de pré-déploiement :
  ```bash
  npm run typeorm migration:run -- -d dist/infrastructure/database/data-source.js
  ```

---

## 5. Sondes de Santé (Health Checks)

Le module NestJS `@nestjs/terminus` expose :
- `GET /health` : Statut global du serveur ;
- `GET /health/live` : Liveness probe (le processus Node tourne) ;
- `GET /health/ready` : Readiness probe (vérification active de la connexion PostgreSQL et de Redis).
