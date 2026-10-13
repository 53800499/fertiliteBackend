# Guide Opérationnel de Déploiement — Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Prérequis Système

- Node.js 20 LTS (Iron) ou supérieur
- Docker Engine 24+ & Docker Compose v2
- PostgreSQL 15+ avec extension `pgcrypto` activée
- Instance Redis 7+

---

## 2. Variables d'Environnement (.env.production)

```dotenv
# Serveur
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://app.fertiliteapp.com

# Base de données PostgreSQL
DATABASE_HOST=postgres.internal.fertiliteapp.com
DATABASE_PORT=5432
DATABASE_USER=ferti_prod_user
DATABASE_PASSWORD=CHANGE_ME_IN_VAULT
DATABASE_NAME=fertidb_prod
DATABASE_SSL=true

# Sécurité & Chiffrement
JWT_SECRET=CHANGE_ME_MIN_64_CHARS_RANDOM_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=CHANGE_ME_MIN_64_CHARS_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=30d
APP_AES_KEY_256=HEX_ENCODED_32_BYTES_FOR_AES_256_GCM

# Redis
REDIS_HOST=redis.internal.fertiliteapp.com
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# Notifications Push (FCM)
FIREBASE_PROJECT_ID=fertiliteapp-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@fertiliteapp-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."
```

---

## 3. Procédure de Déploiement pas-à-pas

1. **Exécution des migrations de schéma** :
   ```bash
   npm run typeorm migration:run
   ```
2. **Construction de l'image Docker** :
   ```bash
   docker build -t fertiliteapp-backend:latest .
   ```
3. **Démarrage du conteneur avec vérification de santé** :
   ```bash
   docker run -d --name backend-api -p 3000:3000 --env-file .env.production fertiliteapp-backend:latest
   ```
4. **Validation de liveness & readiness** :
   ```bash
   curl -f http://localhost:3000/api/v1/health/ready || exit 1
   ```
