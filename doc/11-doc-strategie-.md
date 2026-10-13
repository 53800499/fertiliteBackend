# 11 — Stratégie Data & Machine Learning
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Pipeline Data Engineering & Évolution vers le Machine Learning
- **Périmètre** : Transition vers les Niveaux 2 et 3
- **Date** : 24 septembre 2026

---

## 1. La Vision des « Deux Mondes » : Production vs Data / ML

Afin d'éviter de fragiliser la production opérationnelle tout en préparant rigoureusement les modèles de recherche et d'intelligence artificielle, l'architecture sépare nettement le **monde de production** et le **monde Data/ML** :

```text
               MONDE PRODUCTION                                  MONDE DATA / ML
    ┌────────────────────────────────────┐             ┌────────────────────────────────────┐
    │                                    │             │                                    │
    │          Client Flutter            │             │        Data Pipeline / ETL         │
    │                 │                  │             │  (Filtrage consentement & anonym.) │
    │                 ▼                  │             │                 │                  │
    │            NestJS API              │             │                 ▼                  │
    │                 │                  │             │           Feature Store            │
    │                 ▼                  │             │    (Agrégations & biomarqueurs)    │
    │         PostgreSQL Primaire        │             │                 │                  │
    │                 │                  │             │                 ▼                  │
    │                 ▼                  │  Export     │         Training Pipeline          │
    │          Fertility Engine          │  Anonymisé  │    (Validation croisée, Python)    │
    │         (Stateless API)            ├────────────►│                 │                  │
    │                 │                  │             │                 ▼                  │
    │                 ▼                  │             │          Model Registry            │
    │        Prédiction Restituée        │             │       (Traçabilité & Métriques)    │
    │                                    │             │                 │                  │
    │                                    │             │                 ▼                  │
    │                                    │◄────────────┤         Prediction Service         │
    │                                    │  Inférence  │          (FastAPI / ML v1)         │
    └────────────────────────────────────┘             └────────────────────────────────────┘
```

---

## 2. Conditions Préalables & Déontologie de la Donnée

Conformément aux principes de confidentialité absolue (RGPD / santé) et au chapitre 13 du cadrage :
1. **Consentement explicite et révocable** : Seules les données des utilisatrices ayant explicitement consenti à l'option `entrainement_ml` dans la table `consentement` peuvent être exportées vers le pipeline d'entraînement.
2. **Pseudonymisation irréversible** :
   - Suppression totale des emails, prénoms, adresses IP, identifiants d'appareils ;
   - Remplacement de l'identifiant `utilisateur_id` par un hash cryptographique salé avec une clé rotative jetable (`HMAC-SHA256(userId, secret_salt)`) ;
   - Décalage aléatoire fixe des dates réelles (ex. ajout de $+k$ jours à toutes les dates d'une même utilisatrice) pour empêcher toute ré-identification temporelle tout en préservant exactement les intervalles et durées entre cycles.

---

## 3. Le Pipeline d'Entraînement & Feature Engineering

### 3.1 Caractéristiques extraites (Features)
- **Série temporelle des cycles** : Durées des 12 derniers cycles, moyenne glissante, écart-type glissant, coefficient de variation ($CV = \frac{\sigma}{\mu}$) ;
- **Cinétique des flux menstruels** : Nombre de jours de flux abondant, profil de décroissance du saignement ;
- **Indicateurs biométriques (V2)** : Température basale normalisée (décalage par rapport à la moyenne de phase folliculaire), jours de présence de glaire fertile, valeur numérique de l'hormone LH ;
- **Facteurs démographiques anonymisés** : Tranche d'âge, irrégularité déclarée.

### 3.2 Algorithmes cibles envisagés
- **Modèles de séries temporelles & Arbres de gradient boosting** (XGBoost / LightGBM) pour la prédiction de la probabilité quotidienne d'ovulation ;
- **Modèles de survie / Risques proportionnels** pour modéliser le temps jusqu'au déclenchement des prochaines règles.

---

## 4. Métriques d'Évaluation & Robustesse

Un modèle de fertilité ne s'évalue pas comme un classifieur standard :
1. **Erreur Absolue Moyenne (MAE) sur la date d'ovulation** :
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |\hat{J}_{ovu, i} - J_{ovu, i}^{reel}|$$
   Objectif : MAE $\le 1.5$ jour sur cycles réguliers.
2. **Calibration Probabiliste (Brier Score)** :
   Vérifier que lorsque le modèle annonce une probabilité de conception de 70%, 70% des observations confirment la présence d'ovocytes viables.
3. **Contrôle des Biais & Robustesse** :
   Évaluation stratifiée sur les différentes tranches d'âge et types de cycles (cycles courts, cycles longs, cycles avec syndrome des ovaires polykystiques - SOPK).

---

## 5. Déploiement & Registre de Modèles (`Model Registry`)

Lorsque le modèle ML de Niveau 3 est validé scientifiquement :
1. Il est empaqueté avec ses dépendances (Docker + ONNX ou modèle sérialisé).
2. Il est enregistré dans `version_moteur_prediction` :
   ```sql
   INSERT INTO version_moteur_prediction (numero_version, type_moteur, metriques_performance)
   VALUES ('v3.0-ml-xgboost', 'machine_learning', '{"mae": 1.2, "brier_score": 0.08, "train_size": 25000}');
   ```
3. Il est exposé via un microservice d'inférence sécurisé (FastAPI) consommé par l'adaptateur `MLFertilityEstimator` de NestJS.
