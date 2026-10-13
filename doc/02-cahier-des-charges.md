# 02 — Cahier des Charges Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Backend NestJS & Base de données PostgreSQL
- **Statut** : Validé / Prêt pour implémentation
- **Date** : 24 septembre 2026

---

## 1. Objet & Périmètre du Cahier des Charges

Le présent document formalise l'ensemble des spécifications techniques et fonctionnelles contractuelles incombant au backend de la plateforme FertiliteApp. Il définit les engagements de service (SLA), les critères d'acceptation, les volumétries cibles et les exigences de sécurité strictes applicables à la gestion des données de santé reproductive.

---

## 2. Exigences Fonctionnelles Détaillées (Matrice de Couverture)

Le backend doit satisfaire l'intégralité des cas d'usage décrits dans le SFD pour le périmètre serveur :

### 2.1 Gestion des Comptes, Sessions et Consentements (Module M1)
- **REQ-BE-01 (Inscription)** : Exposer un endpoint permettant l'enregistrement d'une utilisatrice avec email unique, mot de passe robuste, date de naissance (vérification que l'âge $\ge$ 12 ans) et enregistrement horodaté des consentements obligatoires (CGU, Politique de confidentialité).
- **REQ-BE-02 (Authentification)** : Fournir une authentification par couple email / mot de passe basée sur **Argon2id**, émettant une paire de jetons :
  - *Access Token* JWT à durée de vie courte (15 minutes) ;
  - *Refresh Token* opaque à durée de vie paramétrable (30 jours), stocké uniquement sous forme de hash en base (`session_authentification.jeton_rafraichissement_hash`).
- **REQ-BE-03 (Gestion de session multi-appareils)** : Tracer l'identifiant d'appareil, la plateforme (`android`, `ios`) et l'adresse IP. Permettre la révocation unitaire ou globale des sessions actives.
- **REQ-BE-04 (Consentements dynamiques)** : Gérer un registre opposable des consentements (`consentement`), traçant chaque accord/retrait par type (`cgu`, `politique_confidentialite`, `partage_donnees_anonymisees`, `entrainement_ml`, `notifications_marketing`) et version de document, sans jamais écraser l'historique légal.
- **REQ-BE-05 (Suppression de compte & Droit à l'oubli)** : 
  - Phase 1 : Soft delete immédiat avec passage de `statut_compte` à `'supprime'`, enregistrement de `date_suppression_demandee`, et révocation immédiate de tous les tokens.
  - Phase 2 : Purge physique automatique en cascade après un délai de grâce (ex. 30 jours) via un worker planifié.

### 2.2 Gestion des Cycles et Journaux Menstruels (Module M2)
- **REQ-BE-06 (Cycle en cours unique)** : Garantir au niveau de la base qu'une utilisatrice ne peut avoir qu'un seul cycle au statut `'en_cours'` simultanément (index unique partiel).
- **REQ-BE-07 (Clôture et transition de cycle)** : À la déclaration d'un nouveau premier jour de règles :
  - Clôturer automatiquement le cycle précédent au statut `'termine'` ;
  - Calculer `date_fin` et `duree_cycle_jours` du cycle précédent ;
  - Ouvrir le nouveau cycle au statut `'en_cours'` ;
  - Déclencher de manière asynchrone le recalcul des statistiques et une nouvelle estimation.
- **REQ-BE-08 (Journal de flux journalier)** : Enregistrer l'intensité du flux menstruel (`absent`, `spotting`, `leger`, `moyen`, `abondant`) et le niveau de douleur (0 à 10) par jour, avec contrainte d'unicité `(cycle_id, date)`.
- **REQ-BE-09 (Correction rétrospective)** : Permettre la modification d'un cycle passé. Recalculer les durées dérivées et réévaluer les statistiques sans altérer l'historique immuable des anciennes prédictions.

### 2.3 Moteur de Fertilité & Explicabilité (Module M4)
- **REQ-BE-10 (Génération de prédiction)** : Produire une prédiction complète comprenant :
  - Date d'ovulation estimée et marge d'incertitude ($\pm$ jours) ;
  - Date de début et de fin de fenêtre fertile ;
  - Catégorie de fertilité (`faible`, `moyenne`, `elevee`) et score continu (0 à 100) ;
  - Niveau de confiance qualifié (`faible`, `moyen`, `eleve`) ;
  - Traçabilité : rattachement obligatoire à `version_moteur_id` et méthode (`calendrier_statistique`, `indicateurs_combines`, `modele_ml`).
- **REQ-BE-11 (Singleton actif & Append-Only)** : Garantir qu'une seule prédiction est active à la fois par utilisatrice (`est_active = true`), tout en conservant l'intégralité de l'historique pour l'évaluation a posteriori.
- **REQ-BE-12 (Facteurs explicatifs)** : Associer à chaque prédiction au moins un facteur explicatif (`facteur_explicatif`) rédigé en langage naturel, avec un poids de contribution ($0 \le p \le 1$) et un sens d'effet (`renforce`, `diminue`, `neutre`).

### 2.4 Notifications (Module M6)
- **REQ-BE-13 (Planification)** : Maintenir une file d'attente des notifications ciblées selon le fuseau horaire de l'utilisatrice pour :
  - Le rappel de saisie quotidien en l'absence d'observation ;
  - L'approche de la fenêtre fertile estimée ;
  - La date prévue des prochaines règles.
- **REQ-BE-14 (Intégration d'envoi)** : Disposer d'adaptateurs pour les notifications push (Firebase Cloud Messaging - FCM) et les emails transactionnels.

### 2.5 Statistiques de Cycle (Module M7)
- **REQ-BE-15 (Snapshots de régularité)** : Recalculer à chaque cycle terminé :
  - La durée moyenne, minimale et maximale du cycle ;
  - L'écart-type des cycles ;
  - L'indice de régularité (`regulier`, `irregulier`, `tres_irregulier`) selon la dispersion statistique constatée.

---

## 3. Exigences Non Fonctionnelles

### 3.1 Performances & Latence
| Opération | SLA Temps de réponse (P95) | SLA Temps de réponse (P99) |
|---|---|---|
| Authentification / Rafraîchissement JWT | < 100 ms | < 200 ms |
| Consultation du cycle actif & prédiction | < 80 ms | < 150 ms |
| Ingestion d'un flux de règles / observation | < 120 ms | < 250 ms |
| Calcul complet du Fertility Engine V1 | < 250 ms | < 500 ms |
| Synchronisation de lot hors ligne (batch sync) | < 400 ms | < 800 ms |

### 3.2 Sécurité & Traçabilité
- **Chiffrement en transit** : HTTPS obligatoire avec TLS 1.3 (TLS 1.2 minimum acceptable), HSTS activé (durée 1 an), suppression des en-têtes d'information serveur.
- **Chiffrement au repos** : 
  - Base PostgreSQL chiffrée (au niveau stockage bloc) ;
  - Chiffrement applicatif AES-256-GCM pour les champs de notes intimes (`rapport_sexuel.notes_chiffrees`).
- **Isolation des locataires (Row-Level Security)** :
  - Activation de RLS sur toutes les tables contenant des données rattachées à une utilisatrice (`utilisateur_id`).
  - Définition d'un contexte de session PostgreSQL (`SET LOCAL app.utilisateur_id = '...'`) pour interdire toute fuite inter-comptes au niveau moteur.
- **Audit de sécurité** :
  - Table `journal_acces` enregistrant de façon non modifiable (append-only) chaque lecture/modification des données sensibles avec IP, identifiant acteur et résultat.

### 3.3 Disponibilité & Résilience
- **Taux de disponibilité mensuel garanti** : 99.9% hors fenêtres de maintenance programmée.
- **RTO (Recovery Time Objective)** : < 1 heure.
- **RPO (Recovery Point Objective)** : < 15 minutes (archivage continu WAL PostgreSQL / PITR).

---

## 4. Volumétrie Prévisionnelle & Dimensionnement

### 4.1 Hypothèses de charge (Horizon 18 mois)
- Base installée active : 50 000 utilisatrices actives quotidiennes (DAU).
- Cycles par an et par utilisatrice : $\approx 13$ cycles.
- Saisies journalières : $\approx 50\,000 \times 1.5 = 75\,000$ enregistrements / jour.
- Prédictions générées : $\approx 100\,000$ recalculs / mois.

### 4.2 Stratégie d'ingestion et de partitionnement
- Utilisation d'index partiels ciblés sur les singletons courants (`statut = 'en_cours'`, `est_active = true`, `est_snapshot_courant = true`).
- Partitionnement temporel de la table `journal_acces` par intervalle mensuel (`PARTITION BY RANGE (date_action)`) dès dépassement de 500 000 enregistrements.
