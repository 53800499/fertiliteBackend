# ==============================================================================
# ÉTAPE 1 : BUILD DE L'APPLICATION NESTJS
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Installation des outils nécessaires pour compiler les modules natifs (ex: argon2)
RUN apk add --no-cache python3 make g++

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation propre de toutes les dépendances
RUN npm ci

# Copie du code source
COPY . .

# Compilation TypeScript vers JavaScript (dist/)
RUN npm run build

# Nettoyage des devDependencies pour alléger la taille finale
RUN npm prune --omit=dev

# ==============================================================================
# ÉTAPE 2 : IMAGE DE PRODUCTION LÉGÈRE ET SÉCURISÉE
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copie des dépendances de production et du build depuis l'étape précédente
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist

# Exécution sous l'utilisateur non-root 'node' pour la sécurité
USER node

# Port exposé par le conteneur
EXPOSE 3000

# Démarrage du serveur NestJS
CMD ["node", "dist/main"]
