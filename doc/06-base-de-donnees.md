# 06 — Base de Données Backend (PostgreSQL 15+)
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **SGBD cible** : PostgreSQL 15+ ou Supabase
- **Extensions requises** : `pgcrypto` (génération d'UUID v4 `gen_random_uuid()` et chiffrement)
- **Document source** : `docs/Document_Modelisation_BDD_Fertilite.docx` (Version 1.0)
- **Date** : 24 septembre 2026

---

## 1. Vue d'Ensemble & Principes Directeurs de Modélisation

1. **Identifiants UUID natifs** : Toutes les tables métier utilisent des clés primaires `UUID DEFAULT gen_random_uuid()`. Cela permet aux clients mobiles hors ligne de générer des identifiants valides sans risque de collision lors de la synchronisation.
2. **Chaîne de valeur respectée** : Séparation stricte entre les faits bruts saisis par l'utilisatrice (tables d'observations) et les estimations calculées (tables de prédictions).
3. **Immuabilité (Append-Only)** : Les prédictions et facteurs explicatifs ne sont jamais modifiés. Une nouvelle estimation remplace la précédente au statut `est_active = true`.
4. **Isolation par Row-Level Security (RLS)** : Cloisonnement strict des données de santé entre utilisatrices directement au niveau du moteur PostgreSQL.
5. **Préparation Offline-First** : Présence des colonnes `id_client_local` et `statut_synchronisation` sur toutes les tables éligibles à la saisie mobile.

---

## 2. Inventaire des 20 Tables par Domaine

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAINES DU MODÈLE                              │
├─────────────────────────┬──────────────────────────────────────────────┤
│ 1. Compte &             │ • utilisateur                                │
│    Confidentialité      │ • profil_utilisateur                         │
│                         │ • parametre_confidentialite                  │
│                         │ • consentement                               │
│                         │ • session_authentification                   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 2. Cycle &              │ • cycle                                      │
│    Observations         │ • jour_regles                                │
│                         │ • temperature_basale                         │
│                         │ • glaire_cervicale                           │
│                         │ • test_ovulation                             │
│                         │ • type_symptome                              │
│                         │ • observation_symptome                       │
│                         │ • rapport_sexuel (anticipation future)       │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 3. Moteur de            │ • version_moteur_prediction                  │
│    Prédiction           │ • prediction                                 │
│                         │ • facteur_explicatif                         │
│                         │ • statistique_cycle                          │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 4. Engagement &         │ • notification                               │
│    Business             │ • abonnement                                 │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 5. Sécurité & Audit     │ • journal_acces                              │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Définition des 27 Types Énumérés (ENUMs)

```sql
CREATE TYPE statut_compte_enum AS ENUM ('actif', 'suspendu', 'supprime');
CREATE TYPE objectif_enum AS ENUM ('suivi_cycle', 'planifier_grossesse', 'eviter_grossesse', 'comprendre_corps');
CREATE TYPE type_consentement_enum AS ENUM ('cgu', 'politique_confidentialite', 'partage_donnees_anonymisees', 'entrainement_ml', 'notifications_marketing');
CREATE TYPE plateforme_enum AS ENUM ('android', 'ios');
CREATE TYPE statut_cycle_enum AS ENUM ('en_cours', 'termine', 'incomplet');
CREATE TYPE source_saisie_enum AS ENUM ('manuelle', 'importee');
CREATE TYPE sync_enum AS ENUM ('synchronise', 'en_attente', 'conflit');
CREATE TYPE intensite_flux_enum AS ENUM ('absent', 'spotting', 'leger', 'moyen', 'abondant');
CREATE TYPE type_glaire_enum AS ENUM ('sec', 'collant', 'cremeux', 'filant_blanc_oeuf', 'aqueux');
CREATE TYPE resultat_test_lh_enum AS ENUM ('negatif', 'faible', 'positif', 'pic');
CREATE TYPE categorie_symptome_enum AS ENUM ('physique', 'emotionnel', 'digestif', 'cutane', 'autre');
CREATE TYPE type_protection_enum AS ENUM ('aucune', 'preservatif', 'pilule', 'sterilet', 'autre_methode');
CREATE TYPE categorie_fertilite_enum AS ENUM ('faible', 'moyenne', 'elevee');
CREATE TYPE niveau_confiance_enum AS ENUM ('faible', 'moyen', 'eleve');
CREATE TYPE methode_prediction_enum AS ENUM ('calendrier_statistique', 'indicateurs_combines', 'modele_ml');
CREATE TYPE type_facteur_enum AS ENUM ('historique_cycles', 'regularite', 'temperature_basale', 'glaire_cervicale', 'test_ovulation', 'symptome', 'position_dans_cycle');
CREATE TYPE sens_effet_enum AS ENUM ('renforce', 'diminue', 'neutre');
CREATE TYPE type_moteur_enum AS ENUM ('regles_statistiques', 'machine_learning');
CREATE TYPE regularite_enum AS ENUM ('regulier', 'irregulier', 'tres_irregulier');
CREATE TYPE type_notification_enum AS ENUM ('rappel_saisie', 'fenetre_fertile', 'regles_prevues', 'maj_prediction', 'information_generale');
CREATE TYPE canal_notification_enum AS ENUM ('push', 'email', 'in_app');
CREATE TYPE statut_notification_enum AS ENUM ('planifiee', 'envoyee', 'lue', 'annulee', 'echec');
CREATE TYPE plan_abonnement_enum AS ENUM ('gratuit', 'premium_mensuel', 'premium_annuel');
CREATE TYPE statut_abonnement_enum AS ENUM ('actif', 'essai', 'expire', 'annule');
CREATE TYPE type_acteur_enum AS ENUM ('utilisateur', 'systeme', 'administrateur');
CREATE TYPE action_journal_enum AS ENUM ('lecture', 'creation', 'modification', 'suppression', 'export');
CREATE TYPE resultat_action_enum AS ENUM ('succes', 'echec');
```

---

## 4. DDL Physique & Structure des Tables Majeures

### 4.1 Table `utilisateur` & Tables liées
```sql
CREATE TABLE utilisateur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    date_naissance DATE NOT NULL,
    statut_compte statut_compte_enum NOT NULL DEFAULT 'actif',
    email_verifie BOOLEAN NOT NULL DEFAULT false,
    langue_preferee VARCHAR(5) DEFAULT 'fr',
    fuseau_horaire VARCHAR(50) DEFAULT 'Africa/Porto-Novo',
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_maj TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_derniere_connexion TIMESTAMPTZ,
    date_suppression_demandee TIMESTAMPTZ,
    CONSTRAINT chk_age_minimum CHECK (date_naissance <= CURRENT_DATE - INTERVAL '12 years')
);

CREATE TABLE profil_utilisateur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL UNIQUE REFERENCES utilisateur(id) ON DELETE CASCADE,
    prenom VARCHAR(100),
    objectif_principal objectif_enum NOT NULL DEFAULT 'suivi_cycle',
    duree_cycle_habituelle_jours SMALLINT CHECK (duree_cycle_habituelle_jours BETWEEN 15 AND 90),
    duree_regles_habituelle_jours SMALLINT CHECK (duree_regles_habituelle_jours BETWEEN 1 AND 15),
    irregularite_declaree BOOLEAN DEFAULT false,
    date_dernieres_regles_connues DATE
);
```

### 4.2 Tables `cycle` & `jour_regles`
```sql
CREATE TABLE cycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    duree_cycle_jours SMALLINT CHECK (duree_cycle_jours BETWEEN 10 AND 90),
    duree_regles_jours SMALLINT CHECK (duree_regles_jours BETWEEN 1 AND 15),
    statut statut_cycle_enum NOT NULL DEFAULT 'en_cours',
    source_saisie source_saisie_enum DEFAULT 'manuelle',
    id_client_local UUID,
    statut_synchronisation sync_enum NOT NULL DEFAULT 'synchronise',
    CONSTRAINT chk_dates_cycle CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

-- Règle métier : un seul cycle 'en_cours' par utilisatrice
CREATE UNIQUE INDEX ux_cycle_un_seul_en_cours 
ON cycle(utilisateur_id) WHERE statut = 'en_cours';

CREATE TABLE jour_regles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES cycle(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    intensite_flux intensite_flux_enum NOT NULL,
    douleur_niveau SMALLINT CHECK (douleur_niveau BETWEEN 0 AND 10),
    notes TEXT,
    id_client_local UUID,
    statut_synchronisation sync_enum NOT NULL DEFAULT 'synchronise',
    CONSTRAINT ux_jour_regles_cycle_date UNIQUE (cycle_id, date)
);
```

### 4.3 Tables du Moteur de Prédiction
```sql
CREATE TABLE version_moteur_prediction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_version VARCHAR(20) NOT NULL UNIQUE,
    type_moteur type_moteur_enum NOT NULL,
    date_deploiement TIMESTAMPTZ DEFAULT now(),
    date_retrait TIMESTAMPTZ,
    metriques_performance JSONB,
    actif BOOLEAN DEFAULT true
);

CREATE TABLE prediction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES cycle(id) ON DELETE SET NULL,
    version_moteur_id UUID NOT NULL REFERENCES version_moteur_prediction(id),
    date_generation TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_ovulation_estimee DATE,
    marge_incertitude_jours SMALLINT,
    date_debut_fenetre_fertile DATE,
    date_fin_fenetre_fertile DATE,
    score_fertilite_categorie categorie_fertilite_enum NOT NULL,
    score_fertilite_valeur NUMERIC(5,2) CHECK (score_fertilite_valeur BETWEEN 0 AND 100),
    niveau_confiance niveau_confiance_enum NOT NULL,
    methode_utilisee methode_prediction_enum DEFAULT 'calendrier_statistique',
    est_active BOOLEAN DEFAULT true,
    CONSTRAINT chk_dates_fenetre CHECK (date_fin_fenetre_fertile IS NULL OR date_fin_fenetre_fertile >= date_debut_fenetre_fertile)
);

-- Règle métier : une seule prédiction active à la fois par utilisatrice
CREATE UNIQUE INDEX ux_prediction_active_utilisateur 
ON prediction(utilisateur_id) WHERE est_active = true;

CREATE TABLE facteur_explicatif (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES prediction(id) ON DELETE CASCADE,
    type_facteur type_facteur_enum NOT NULL,
    description TEXT NOT NULL,
    poids_contribution NUMERIC(4,3) CHECK (poids_contribution BETWEEN 0 AND 1),
    sens_effet sens_effet_enum DEFAULT 'neutre',
    ordre_affichage SMALLINT DEFAULT 0
);
```

### 4.4 Sécurité, Audit & Partitionnement
```sql
CREATE TABLE journal_acces (
    id BIGSERIAL,
    utilisateur_cible_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    acteur_id UUID,
    type_acteur type_acteur_enum NOT NULL,
    action action_journal_enum NOT NULL,
    ressource_type VARCHAR(100) NOT NULL,
    ressource_id UUID,
    adresse_ip VARCHAR(45),
    resultat resultat_action_enum DEFAULT 'succes',
    details JSONB,
    date_action TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, date_action)
) PARTITION BY RANGE (date_action);

-- Exemple de création de partition mensuelle
CREATE TABLE journal_acces_2026_09 PARTITION OF journal_acces
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
```

---

## 5. Politiques de Sécurité au Niveau Ligne (RLS)

Activation systématique de Row-Level Security sur l'ensemble des tables contenant des données d'utilisatrice :

```sql
ALTER TABLE cycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_cycle_isolation ON cycle
    USING (utilisateur_id = current_setting('app.utilisateur_id', true)::uuid);

ALTER TABLE jour_regles ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_jour_regles_isolation ON jour_regles
    USING (cycle_id IN (
        SELECT id FROM cycle WHERE utilisateur_id = current_setting('app.utilisateur_id', true)::uuid
    ));

ALTER TABLE prediction ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_prediction_isolation ON prediction
    USING (utilisateur_id = current_setting('app.utilisateur_id', true)::uuid);
```
