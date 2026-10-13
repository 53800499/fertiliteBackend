# 01 — Document de Cadrage Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp (Plateforme d'estimation intelligente de la fertilité)
- **Composant** : Backend API & Moteur d'estimation
- **Technologies cibles** : NestJS, TypeScript, PostgreSQL 15+ / Supabase, Docker
- **Version du document** : 1.0
- **Date** : 24 septembre 2026
- **Documents sources de référence** :
  - `docs/Document_de_cadrage_Application_Estimation_Fertilite.pdf` (Version 1.0, 24 août 2026)
  - `docs/Document_SFD_Fertilite.docx` (Version 1.0, 14 septembre 2026)
  - `docs/Document_Modelisation_BDD_Fertilite.docx` (Version 1.0, 14 septembre 2026)

---

## 1. Contexte & Problématique

### 1.1 Contexte général
La majorité des applications existantes de suivi menstruel se contentent d'appliquer des calculs calendaires déterministes et rigides (ex. considérer systématiquement que l'ovulation a lieu au 14ᵉ jour du cycle). Or, la durée et les phases du cycle féminin présentent une variabilité inter-individuelle et intra-individuelle majeure. 

**FertiliteApp** a pour vocation de dépasser ce simple calendrier en fournissant :
- Une analyse fine de l'historique personnel des cycles ;
- Une estimation probabiliste et contextualisée de l'ovulation et de la fenêtre fertile ;
- Une qualification rigoureuse de l'incertitude via un **niveau de confiance** explicite (faible, moyen, élevé) ;
- Une **explication en langage clair** des facteurs ayant influencé l'estimation ;
- Un socle d'accueil pour des indicateurs complémentaires (température basale, glaire cervicale, tests d'ovulation LH, symptômes) ;
- Une architecture préparée pour une transition sans rupture vers l'intelligence artificielle (machine learning).

### 1.2 Rôle du Backend dans le système
Le backend agit comme :
1. **L'autorité centrale de persistance et de synchronisation** (PostgreSQL / Supabase) pour les données multi-appareils ;
2. **Le garant de la sécurité et de la confidentialité extrême** des données de santé reproductive (chiffrement, audit, droits d'accès RLS) ;
3. **Le sanctuaire de calcul du Fertility Engine**, découplé de la couche d'ingestion des données et capable d'évoluer d'un algorithme statistique vers du ML sans refonte de l'API ;
4. **Le planificateur intelligent** des notifications et rappels physiologiques (synchronisés avec les fuseaux horaires des utilisatrices).

---

## 2. Le Principe Directeur : Éthique & Positionnement

> **« Estimer, expliquer et informer — jamais garantir. »**

Le backend respecte scrupuleusement la chaîne de valeur fondamentale définie au chapitre 24 du document de cadrage :

```text
Donnée réelle saisie (Observation)
         │
         ▼
Analyse & Traitement statistique (Analyzer)
         │
         ▼
Estimation probabiliste (Estimator)
         │
         ▼
Niveau de confiance & Facteurs explicatifs (Confidence & Explanations)
```

### Règles déontologiques non négociables :
- **Aucun diagnostic médical** : Le backend ne retourne jamais de certitude biologique ou médicale (ex. interdiction de déclarer « vous êtes enceinte » ou « vous êtes stérile »).
- **Non-substitut contraceptif** : L'estimation de la fenêtre fertile est informative et probabiliste ; elle ne constitue en aucun cas une méthode de contraception certifiée.
- **Transparence algorithmique** : Chaque prédiction stockée en base est immuable et rattachée à la version exacte du moteur (`version_moteur_prediction`) qui l'a produite.

---

## 3. Périmètre fonctionnel du Backend

### 3.1 Périmètre MVP (Version 1) — Obligatoire
Conformément au chapitre 15 du cadrage et aux spécifications fonctionnelles :
- **Gestion des comptes & identités (M1)** : Inscription, authentification sécurisée (Argon2id + JWT + refresh tokens révocables), gestion du profil déclaratif (durée habituelle, irrégularité déclarée), gestion stricte des consentements versionnés et droit à l'oubli (soft delete + purge planifiée).
- **Gestion des cycles (M2)** : Ingestion des dates de début/fin de règles, calcul automatique des durées de cycles, journalisation quotidienne du flux menstruel (absent, spotting, léger, moyen, abondant) et niveau de douleur.
- **Alimentation du calendrier & détail du jour (M3)** : Fourniture des vues agrégées mensuelles et journalières.
- **Moteur d'estimation V1 (M4)** : 
  - Algorithme calendaire et statistique de base ;
  - Calcul de la date d'ovulation estimée et de la marge d'incertitude ;
  - Détermination de la fenêtre fertile (bornes début/fin) ;
  - Score de fertilité continu (0–100) et catégorisation (`faible`, `moyenne`, `elevee`) ;
  - Calcul du niveau de confiance (`faible`, `moyen`, `eleve`) ;
  - Génération de facteurs explicatifs textuels et ordonnés.
- **Notifications système (M6)** : Planification des rappels de saisie, alertes d'entrée dans la fenêtre fertile et prévision des prochaines règles.
- **Statistiques de cycle (M7)** : Snapshots périodiques de régularité (moyenne, écart-type, min/max, indice de régularité).
- **Sécurité & Confidentialité (Transverse)** : Journal d'accès (`journal_acces`) et isolation des données au niveau ligne (PostgreSQL RLS).

### 3.2 Périmètre Phase 4 (V2) & Hors MVP
- **Indicateurs complémentaires (M5 - V2)** : Prise en charge des endpoints de température basale (°C), glaire cervicale, tests urinaires LH et catalogue de symptômes (modélisés en base dès la V1).
- **Analyse d'un rapport sexuel (M8 - Futur hors MVP)** : Évaluation contextuelle avec chiffrement applicatif renforcé (AES-256-GCM) et journalisation systématique.
- **Abonnements & Monétisation (M9 - Freemium)** : Gestion des plans gratuit / premium.
- **Intelligence Artificielle avancée (ML Pipeline - V3)** : Entraînement sur données strictement anonymisées avec consentement explicite (`entrainement_ml`).

---

## 4. Acteurs & Rôles côté Backend

| Acteur | Rôle dans l'écosystème Backend |
|---|---|
| **Visiteuse** | Non authentifiée. Accès restreint aux endpoints d'inscription (`POST /auth/register`), de connexion (`POST /auth/login`) et de réinitialisation (`POST /auth/forgot-password`). |
| **Utilisatrice Standard (Gratuit)** | Authentifiée via JWT. Accès aux fonctionnalités du socle MVP de saisie, consultation des cycles, estimations et notifications. |
| **Utilisatrice Premium** | Authentifiée via JWT. Accès étendu aux statistiques approfondies, analyses multivariées et export complet. |
| **Système : Fertility Engine** | Service interne automatisé recalculant l'estimation après chaque saisie d'un nouveau cycle ou événement significatif. |
| **Système : Notification Scheduler** | Tâche d'arrière-plan inspectant la table `notification` et les fuseaux horaires pour déclencher les envois via FCM ou email. |
| **Système : Data Retention Worker** | Job nocturne procédant à la purge physique des comptes marqués supprimés dont le délai de grâce est expiré. |

---

## 5. Exigences Non Fonctionnelles & Contraintes Majeures

1. **Performance** :
   - Temps de réponse de l'API sur les consultations de cycles et calendrier : **< 200 ms**.
   - Temps d'exécution du calcul d'une estimation par le moteur V1 : **< 300 ms** (maximum absolu 1 seconde).
2. **Confidentialité & Protection des données de santé** :
   - Conformité aux principes du RGPD (minimisation des données, consentement explicite opt-in, portabilité, droit à l'oubli).
   - Chiffrement en transit (TLS 1.3 obligatoire) et chiffrement au repos.
   - Chiffrement applicatif AES-256-GCM pour les notes ultra-sensibles.
3. **Disponibilité & Résilience** :
   - Disponibilité cible de l'API de 99.9%.
   - Prise en charge transparente des synchronisations différées générées par les clients mobiles hors ligne (réconciliation via `id_client_local`).
4. **Évolutivité de l'architecture** :
   - Modular Monolith NestJS sans dépendances circulaires, permettant l'extraction ultérieure du Fertility Engine en microservice FastAPI/Python si nécessaire.
