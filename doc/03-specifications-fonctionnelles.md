# 03 — Spécifications Fonctionnelles Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Backend NestJS
- **Document source** : `docs/Document_SFD_Fertilite.docx` (SFD Version 1.0)
- **Couverture** : Cas d'usage UC-01 à UC-26 déclinés côté serveur

---

## 1. Matrice de Déclinaison des Cas d'Usage Backend

Le tableau ci-dessous explicite la correspondance entre les cas d'usage décrits dans le SFD et les contrôleurs/services NestJS responsables de leur exécution.

| Code SFD | Cas d'Usage | Module NestJS | Contrôleur / Endpoint | Rôle Serveur & Règles Métier |
|---|---|---|---|---|
| **UC-01** | Créer un compte | `auth` / `users` | `POST /api/v1/auth/register` | Unicité email, vérification $\ge 12$ ans, hash Argon2id, création `utilisateur`, `profil_utilisateur`, `parametre_confidentialite` et `consentement`. |
| **UC-02** | Se connecter | `auth` | `POST /api/v1/auth/login` | Vérification credentials, détection brute-force, création `session_authentification`, émission JWT Access + Refresh. |
| **UC-03** | Récupérer l'accès | `auth` | `POST /api/v1/auth/forgot-password`<br>`POST /api/v1/auth/reset-password` | Token de réinitialisation unique (validité 1h), invalidation de toutes les sessions existantes (`revoque = true`). |
| **UC-04** | Configurer le profil | `users` | `GET /api/v1/users/profile`<br>`PUT /api/v1/users/profile` | Gestion de l'objectif (`suivi_cycle`, `planifier_grossesse`, etc.), durées habituelles de cycle et règles, amorçage du Fertility Engine. |
| **UC-05** | Paramètres confidentialité | `privacy` | `GET /api/v1/privacy/settings`<br>`PATCH /api/v1/privacy/settings` | Gestion des consentements, opt-in ML/recherche, verrouillage biométrique, révocation des sessions distantes. |
| **UC-06** | Supprimer son compte | `users` / `privacy` | `POST /api/v1/users/delete-request` | Soft delete (`statut_compte = 'supprime'`), horodatage `date_suppression_demandee`, révocation sessions, planification de purge. |
| **UC-07** | Début des règles | `cycles` | `POST /api/v1/cycles/start` | Clôture automatique du cycle précédent au statut `'termine'`, calcul durée, création nouveau cycle `'en_cours'`, recalcul prédiction. |
| **UC-08** | Saisir flux quotidien | `cycles` | `POST /api/v1/cycles/days` | Ingestion `jour_regles` avec intensité (`absent` à `abondant`), douleur (0-10), unicité par jour, réconciliation `id_client_local`. |
| **UC-09** | Corriger cycle passé | `cycles` | `PUT /api/v1/cycles/:id` | Recalcul durées dérivées, recalcul des statistiques, conservation immuable des prédictions passées. |
| **UC-10** | Consulter historique | `cycles` | `GET /api/v1/cycles` | Pagination, tri chronologique inverse, filtres par statut et année. |
| **UC-11** | Calendrier mensuel | `cycles` / `fertility` | `GET /api/v1/calendar/month` | Agrégation sur l'intervalle [début mois - 7j, fin mois + 7j] des règles, fenêtres fertiles et jours d'ovulation estimés. |
| **UC-12** | Détail d'un jour | `observations` / `fertility` | `GET /api/v1/calendar/days/:date` | Fusion des observations (flux, température, glaire, symptômes) et de l'état de fertilité estimé du jour. |
| **UC-13** | Générer estimation | `fertility` | `POST /api/v1/fertility/recalculate` | Déclenchement Fertility Engine, calcul ovulation, fenêtre fertile, confiance, facteurs explicatifs, enregistrement append-only. |
| **UC-14** | Score de fertilité | `fertility` | `GET /api/v1/fertility/current` | Restitution de la prédiction active (`est_active = true`), score continu (0-100), catégorie, niveau de confiance. |
| **UC-15** | Explication prédiction | `fertility` | `GET /api/v1/fertility/current/factors` | Extraction ordonnée des facteurs explicatifs en langage clair avec pondération. |
| **UC-16** | Température basale *(V2)* | `observations` | `POST /api/v1/observations/temperature` | Saisie T°C, validation plage [34.0, 42.0], heure, perturbateur (alcool, maladie), unicité par jour. |
| **UC-17** | Glaire cervicale *(V2)* | `observations` | `POST /api/v1/observations/cervical-mucus` | Saisie type (`sec`, `collant`, `cremeux`, `filant_blanc_oeuf`, `aqueux`), unicité par jour. |
| **UC-18** | Test ovulation *(V2)* | `observations` | `POST /api/v1/observations/lh-test` | Saisie résultat LH (`negatif`, `faible`, `positif`, `pic`), valeur numérique mUI/mL, multiples tests autorisés par jour. |
| **UC-19** | Symptômes *(V2)* | `observations` | `POST /api/v1/observations/symptoms` | Ingestion catalogue de symptômes avec intensité (1-5), association `observation_symptome`. |
| **UC-20** | Rappel de saisie | `notifications` | Job interne (`NotificationWorker`) | Détection d'absence de saisie en fin de journée selon fuseau horaire, envoi push FCM. |
| **UC-21** | Alerte fenêtre fertile | `notifications` | Job interne (`NotificationWorker`) | Évaluation de la date courante par rapport à la prédiction active, émission de l'alerte à J-2 de la fenêtre. |
| **UC-22** | Préférences notifs | `notifications` | `GET/PUT /api/v1/notifications/preferences` | Paramétrage des canaux (push/email) et types d'alertes autorisées. |
| **UC-23** | Statistiques cycles | `analytics` | `GET /api/v1/analytics/cycle-stats` | Restitution du snapshot courant de régularité (moyenne, min/max, écart-type, indice). |
| **UC-24** | Rapport intime *(Futur)* | `observations` | `POST /api/v1/observations/intercourse` | Enregistrement protégé, chiffrement applicatif AES-256-GCM, traçabilité immédiate dans `journal_acces`. |
| **UC-25** | Souscrire Premium | `analytics` / `billing` | `POST /api/v1/billing/subscribe` | Validation du webhook de paiement, activation abonnement, unicité de l'abonnement actif. |
| **UC-26** | Gérer abonnement | `analytics` / `billing` | `GET/POST /api/v1/billing/cancel` | Désactivation du renouvellement automatique, maintien des droits jusqu'à échéance. |

---

## 2. Description Fonctionnelle Approfondie des Cas d'Usage Clés

### 2.1 UC-07 & UC-08 : Gestion et Transition de Cycle
#### Flux métier côté serveur :
1. Réception de la requête `POST /api/v1/cycles/start` avec `{ date_debut: "2026-09-24", source_saisie: "manuelle", id_client_local: "..." }`.
2. Démarrage d'une transaction de base de données.
3. Recherche d'un éventuel cycle existant au statut `'en_cours'` pour l'utilisatrice.
4. Si un cycle est trouvé :
   - Vérification que la nouvelle `date_debut` est strictement postérieure à la `date_debut` du cycle précédent ;
   - Calcul de `date_fin = date_debut_nouvelle - 1 jour` ;
   - Calcul de `duree_cycle_jours = date_fin - date_debut + 1` ;
   - Passage du statut à `'termine'` ;
   - Mise à jour du cycle précédent.
5. Création du nouveau cycle avec `statut = 'en_cours'`, `date_debut = date_debut_nouvelle`, `id_client_local`.
6. Enregistrement automatique du premier jour dans `jour_regles` avec `intensite_flux = 'leger'` ou `'moyen'` (selon saisie).
7. Validation de la transaction (Commit).
8. Émission de l'événement interne NestJS `CycleStartedEvent(utilisateurId, newCycleId)`.
9. En asynchrone :
   - Recalcul des statistiques du cycle via `AnalyticsService` ;
   - Recalcul de l'estimation de fertilité via `FertilityService.calculateEstimate()`.

---

### 2.2 UC-13 : Algorithme de Recalcul d'Estimation (Fertility Engine)
#### Déclencheurs serveur :
- Nouvel enregistrement d'un cycle (UC-07) ;
- Modification rétrospective d'un cycle (UC-09) ;
- Saisie d'une observation biologique (température, glaire, test LH en V2) ;
- Appel explicite de rafraîchissement ou job périodique.

#### Séquence d'exécution :
```text
Requête de recalcul
        │
        ▼
Récupération de l'historique des cycles (au moins les 6 à 12 derniers cycles)
        │
        ▼
Calcul de la régularité statistique (Moyenne, Écart-type)
        │
        ├─ Si < 2 cycles enregistrés :
        │    Utilisation des paramètres déclaratifs du profil (UC-04)
        │    Niveau de confiance forcé à 'faible'
        │    Facteur explicatif : "Estimation basée sur vos déclarations initiales"
        │
        └─ Si ≥ 2 cycles enregistrés :
             Application de la durée moyenne observée
             Ovulation théorique = Date début cycle + (Durée moyenne - 14 jours)
             Fenêtre fertile = [Date Ovulation - 5 jours, Date Ovulation + 1 jour]
             Score de fertilité = Courbe de probabilité selon la position du jour
             Niveau de confiance = Déterminé par l'écart-type et le nombre de cycles
        │
        ▼
Génération des facteurs explicatifs textuels
        │
        ▼
Transaction d'écriture append-only :
  - UPDATE prediction SET est_active = false WHERE utilisateur_id = :id AND est_active = true
  - INSERT INTO prediction (...) VALUES (...) RETURNING id
  - INSERT INTO facteur_explicatif (prediction_id, ...) VALUES (...)
```

---

### 2.3 UC-05 & UC-06 : Politique de Confidentialité & Droit à l'Oubli
#### Règles de purge et de rétention :
1. **Soft Delete (J0)** : L'utilisatrice valide la suppression de son compte via son mot de passe.
   - `statut_compte` devient `'supprime'`.
   - `date_suppression_demandee` reçoit le timestamp courant.
   - Toutes les sessions de la table `session_authentification` sont révoquées (`revoque = true`).
2. **Délai de grâce (J0 à J30)** : Durant 30 jours, aucune donnée n'est consultable via l'API. Si l'utilisatrice contacte le support pour annuler, une procédure manuelle est envisageable.
3. **Hard Delete (J30+)** : Le cron nocturne `AccountPurgeJob` :
   - Sélectionne les comptes ayant `statut_compte = 'supprime'` ET `date_suppression_demandee < NOW() - INTERVAL '30 days'` ;
   - Exécute `DELETE FROM utilisateur WHERE id = :id` ;
   - Grâce aux contraintes `ON DELETE CASCADE`, l'ensemble des données dépendantes (profil, cycles, observations, prédictions, notifications) est définitivement et physiquement anéanti ;
   - Dans `journal_acces`, la contrainte `ON DELETE SET NULL` anonymise la trace d'audit en passant `utilisateur_cible_id` à `NULL`, préservant la conformité légale sans lier la donnée à une identité.
