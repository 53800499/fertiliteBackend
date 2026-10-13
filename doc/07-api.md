# 07 — Spécifications de l'API REST Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Protocole** : REST / JSON sur HTTPS (TLS 1.3)
- **Base URL** : `https://api.fertiliteapp.com/api/v1`
- **Authentification** : En-tête HTTP `Authorization: Bearer <access_token>`
- **Format de date** : ISO 8601 UTC (`YYYY-MM-DD` pour les dates physiologiques, `YYYY-MM-DDTHH:mm:ss.sssZ` pour les horodatages)
- **Date** : 24 septembre 2026

---

## 1. Conventions Générales & Format des Réponses

### 1.1 Format d'erreur standard (RFC 7807 adapté)
Toute réponse en échec (codes HTTP $4xx$ et $5xx$) adopte une structure prévisible :

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["date_naissance must be a valid ISO 8601 date string", "Age must be at least 12 years old"],
  "errorCode": "ERR_VALIDATION_FAILED",
  "timestamp": "2026-09-24T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### 1.2 Pagination standard
Pour toutes les collections de données (historique des cycles, notifications, logs) :
- Paramètres de requête : `?page=1&limit=20` (limite par défaut : 20, maximum : 100).
- Métadonnées de pagination dans l'enveloppe :

```json
{
  "data": [ ... ],
  "meta": {
    "totalItems": 48,
    "itemCount": 20,
    "itemsPerPage": 20,
    "totalPages": 3,
    "currentPage": 1
  }
}
```

---

## 2. Endpoints par Domaine Fonctionnel

### 2.1 Authentification & Sessions (`/auth`)

| Méthode | Endpoint | Description | Sécurité |
|---|---|---|---|
| `POST` | `/auth/register` | Création de compte avec consentements initiaux | Public |
| `POST` | `/auth/login` | Connexion par email/mot de passe (retourne Access + Refresh) | Public |
| `POST` | `/auth/refresh` | Renouvellement du JWT Access Token via Refresh Token | Public (Refresh Token requis) |
| `POST` | `/auth/logout` | Révocation de la session courante | Bearer JWT |
| `POST` | `/auth/forgot-password` | Demande d'envoi du lien de réinitialisation | Public |
| `POST` | `/auth/reset-password` | Réinitialisation et révocation de toutes les sessions | Public (Reset Token requis) |

#### Exemple : `POST /auth/register`
**Requête** :
```json
{
  "email": "awa.k@example.com",
  "password": "Password123!Secure",
  "birthDate": "1998-05-14",
  "preferredLanguage": "fr",
  "timezone": "Africa/Porto-Novo",
  "consents": [
    { "type": "cgu", "version": "1.0", "accepted": true },
    { "type": "politique_confidentialite", "version": "1.0", "accepted": true },
    { "type": "partage_donnees_anonymisees", "version": "1.0", "accepted": false }
  ]
}
```
**Réponse** (`201 Created`) :
```json
{
  "user": {
    "id": "b3e2a77f-1d84-4821-9e73-0fa942be6a42",
    "email": "awa.k@example.com",
    "emailVerified": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "d8e3b4a2-19c4-42b7-8df7-...",
    "expiresIn": 900
  }
}
```

---

### 2.2 Profil & Confidentialité (`/users`, `/privacy`)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/users/profile` | Lecture du profil utilisateur et des durées habituelles déclarées |
| `PUT` | `/users/profile` | Mise à jour du prénom, de l'objectif et des durées de référence |
| `POST` | `/users/delete-request` | Déclenchement du soft-delete du compte (mot de passe requis) |
| `GET` | `/privacy/settings` | Consultation des paramètres de confidentialité actifs |
| `PATCH` | `/privacy/settings` | Modification des interrupteurs (recherche, biométrie, notifs) |
| `GET` | `/privacy/consents` | Historique opposable des consentements donnés et retirés |
| `POST` | `/privacy/consents` | Enregistrement d'un nouvel accord ou d'un retrait |
| `GET` | `/privacy/sessions` | Liste des sessions actives par appareil |
| `DELETE` | `/privacy/sessions/:id` | Révocation à distance d'une session spécifique |

---

### 2.3 Cycles Menstruels (`/cycles`)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/cycles/start` | Déclaration du premier jour de règles (clôture automatique précédent) |
| `GET` | `/cycles/current` | Récupération du cycle au statut `'en_cours'` |
| `GET` | `/cycles` | Historique paginé de tous les cycles passés |
| `GET` | `/cycles/:id` | Détail d'un cycle avec liste des jours de règles |
| `PUT` | `/cycles/:id` | Correction d'un cycle passé (dates, durées) |
| `POST` | `/cycles/days` | Enregistrement ou mise à jour du flux menstruel d'un jour (`jour_regles`) |
| `DELETE` | `/cycles/days/:id` | Suppression d'une saisie de jour de règles erronée |

#### Exemple : `POST /cycles/start`
**Requête** :
```json
{
  "startDate": "2026-09-24",
  "flowIntensity": "moyen",
  "painLevel": 3,
  "localClientId": "e4f8d21b-68d1-419b-a3d8-3e47b85f2910"
}
```
**Réponse** (`201 Created`) :
```json
{
  "currentCycle": {
    "id": "f518e91a-7b3c-44da-8be9-9d7a85bc2174",
    "startDate": "2026-09-24",
    "status": "en_cours",
    "localClientId": "e4f8d21b-68d1-419b-a3d8-3e47b85f2910"
  },
  "previousCycleClosed": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "startDate": "2026-08-26",
    "endDate": "2026-09-23",
    "cycleLengthDays": 29,
    "status": "termine"
  }
}
```

---

### 2.4 Moteur de Fertilité & Calendrier (`/fertility`, `/calendar`)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/fertility/current` | Prédiction active courante (`est_active = true`), score et confiance |
| `GET` | `/fertility/current/factors` | Liste ordonnée des facteurs explicatifs de la prédiction active |
| `POST` | `/fertility/recalculate` | Forçage manuel d'un recalcul par le Fertility Engine |
| `GET` | `/fertility/history` | Historique immuable des estimations générées dans le passé |
| `GET` | `/calendar/month` | Vue calendrier : agrégation des règles, ovulation et fenêtre fertile |
| `GET` | `/calendar/days/:date` | Détail clinique et prédictif complet pour une date donnée |

#### Exemple : `GET /fertility/current`
**Réponse** (`200 OK`) :
```json
{
  "predictionId": "7e3b91a2-4c5d-4f8a-9e1b-2c3d4e5f6a7b",
  "generationDate": "2026-09-24T10:15:00.000Z",
  "estimatedOvulationDate": "2026-10-08",
  "uncertaintyMarginDays": 1,
  "fertileWindow": {
    "startDate": "2026-10-02",
    "endDate": "2026-10-09"
  },
  "fertilityCategory": "moyenne",
  "fertilityScoreValue": 68.5,
  "confidenceLevel": "eleve",
  "method": "calendrier_statistique",
  "algorithm": "calendar_v1",
  "modelVersion": "v1.0-calendrier",
  "factors": [
    {
      "type": "historique_cycles",
      "description": "Vos 6 derniers cycles durent en moyenne 29 jours.",
      "weight": 0.450,
      "direction": "renforce",
      "displayOrder": 1
    },
    {
      "type": "regularite",
      "description": "Vos cycles sont très réguliers (variation inférieure à 1 jour).",
      "weight": 0.350,
      "direction": "renforce",
      "displayOrder": 2
    }
  ]
}
```

---

### 2.5 Indicateurs Complémentaires V2 (`/observations`)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/observations/temperature` | Saisie d'une température basale quotidienne (°C) |
| `POST` | `/observations/cervical-mucus` | Saisie du type de glaire cervicale observée |
| `POST` | `/observations/lh-test` | Saisie d'un résultat de test urinaire d'ovulation |
| `POST` | `/observations/symptoms` | Saisie d'un ou plusieurs symptômes du catalogue avec intensité (1-5) |
| `GET` | `/observations/symptoms/catalog` | Liste du catalogue de référence des symptômes actifs |
| `POST` | `/observations/intercourse` | Enregistrement protégé d'un rapport intime *(Hors MVP - chiffrement AES)* |

---

### 2.6 Notifications & Statistiques (`/notifications`, `/analytics`)

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | Liste des notifications reçues par l'utilisatrice |
| `PATCH` | `/notifications/:id/read` | Marquage d'une notification comme lue |
| `GET` | `/notifications/preferences` | Lecture des préférences d'alertes et de canaux |
| `PUT` | `/notifications/preferences` | Mise à jour des heures d'envoi et canaux préférés |
| `GET` | `/analytics/cycle-stats` | Statistiques globales (moyenne, écart-type, indice de régularité) |
