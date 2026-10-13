# 05 — Spécifications Techniques Backend : Le Fertility Engine
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Cœur algorithmique (`src/fertility/`)
- **Version** : 1.0
- **Date** : 24 septembre 2026

---

## 1. Philosophie & Conception du Fertility Engine

Le **Fertility Engine** est le cœur à haute valeur ajoutée de la plateforme. Conformément aux principes directeurs :
1. **Découplage strict** : Le moteur est totalement isolé de la persistance brute et des contrôleurs HTTP. Il reçoit un objet d'entrée typé (`FertilityInput`) et produit un résultat immuable (`FertilityPredictionOutput`).
2. **Distinction entre Estimation et Prédiction** :
   - **L'estimation** s'appuie sur des règles physiologiques déterministes et des modèles statistiques paramétriques appliqués à l'historique et aux observations réelles.
   - **La prédiction** fait référence aux probabilités conditionnelles ($P(\text{ovulation à } J_x)$, $P(\text{fertilité à } J_x)$) issues d'un modèle entraîné sur un large corpus de cycles.
3. **Évolution progressive en 3 niveaux** : Le système est conçu pour passer du Niveau 1 au Niveau 3 sans réécrire l'application cliente ni les entités de base.

---

## 2. Le Contrat d'Interface : `FertilityEstimator`

Toutes les implémentations de calcul de fertilité implémentent l'interface TypeScript unique `FertilityEstimator` :

```typescript
// src/fertility/interfaces/fertility-estimator.interface.ts

export interface FertilityCycleHistory {
  cycleId: string;
  startDate: Date;
  endDate?: Date;
  cycleLengthDays?: number;
  periodDurationDays?: number;
  isRegular?: boolean;
}

export interface FertilityObservationPoint {
  date: Date;
  flowIntensity?: 'absent' | 'spotting' | 'leger' | 'moyen' | 'abondant';
  basalTemperatureCelsius?: number;
  cervicalMucusType?: 'sec' | 'collant' | 'cremeux' | 'filant_blanc_oeuf' | 'aqueux';
  lhTestResult?: 'negatif' | 'faible' | 'positif' | 'pic';
  symptoms?: Array<{ code: string; intensity: number }>;
}

export interface FertilityInput {
  userId: string;
  currentCycleStartDate: Date;
  declaredCycleDurationDays?: number;
  declaredPeriodDurationDays?: number;
  declaredIrregularity?: boolean;
  history: FertilityCycleHistory[];
  observations: FertilityObservationPoint[];
}

export interface FactorExplanationOutput {
  factorType: 
    | 'historique_cycles' 
    | 'regularite' 
    | 'temperature_basale' 
    | 'glaire_cervicale' 
    | 'test_ovulation' 
    | 'symptome' 
    | 'position_dans_cycle';
  description: string;
  contributionWeight: number; // 0.000 à 1.000
  effectDirection: 'renforce' | 'diminue' | 'neutre';
  displayOrder: number;
}

export interface FertilityPredictionOutput {
  estimatedOvulationDate: Date;
  uncertaintyMarginDays: number; // ex: ± 2 jours
  fertileWindowStartDate: Date;
  fertileWindowEndDate: Date;
  fertilityCategory: 'faible' | 'moyenne' | 'elevee';
  fertilityScoreValue: number; // Score continu 0 à 100
  confidenceLevel: 'faible' | 'moyen' | 'eleve';
  algorithm: 'calendar_v1' | 'statistical_v1' | 'ml_v1';
  modelVersion: string; // Référence à version_moteur_prediction
  factors: FactorExplanationOutput[];
}

export interface FertilityEstimator {
  readonly version: string;
  readonly algorithmName: 'calendar_v1' | 'statistical_v1' | 'ml_v1';
  
  estimate(input: FertilityInput): Promise<FertilityPredictionOutput>;
}
```

---

## 3. Les Trois Niveaux d'Évolution

```text
       NIVEAU 1                       NIVEAU 2                       NIVEAU 3
  Estimation Calendaire           Modèle Statistique           Modèle ML Personnalisé
 (MVP — Règles de Base)         (Multi-indicateurs V2)        (Pipeline Python / V3)
 
 ┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
 │ • Historique cycles  │       │ • Historique étendu  │       │ • Feature Store      │
 │ • Durée moyenne      │       │ • Variabilité σ      │       │ • Données anonymisées│
 │ • Phase lutéale (14j)│       │ • Glaire cervicale   │       │ • Deep Learning / XGB│
 │ • Fenêtre [-5j, +1j] │       │ • Température (T°)   │       │ • Calibration proba  │
 └──────────┬───────────┘       │ • Tests LH urinaires │       └──────────┬───────────┘
            │                   └──────────┬───────────┘                  │
            ▼                              ▼                              ▼
   CalendarEstimator              StatisticalEstimator           MLFertilityEstimator
```

### 3.1 Niveau 1 : Algorithme Calendaire (`CalendarEstimator` - MVP)
Applicable immédiatement lors du lancement :
1. **Échantillonnage** : Analyse des cycles enregistrés (minimum 2 cycles complets pour exploiter les données réelles, sinon repli sur le profil déclaratif).
2. **Durée de référence ($D_{ref}$)** :
   $$\overline{D} = \frac{1}{N} \sum_{i=1}^{N} D_i$$
   Si $N < 2$, $D_{ref} = \text{duree\_cycle\_habituelle\_jours}$ déclarée dans le profil.
3. **Date d'ovulation théorique ($J_{ovu}$)** :
   La phase lutéale humaine est biologiquement la plus constante ($\approx 14$ jours).
   $$J_{ovu} = \text{date\_debut\_cycle} + (D_{ref} - 14 \text{ jours})$$
4. **Marge d'incertitude ($\Delta$)** :
   - Si cycle régulier (écart-type $\sigma \le 1.5$ jour) : $\pm 1$ jour.
   - Si régularité modérée ($1.5 < \sigma \le 3$ jours) : $\pm 2$ jours.
   - Si cycle irrégulier ($\sigma > 3$ jours ou $N < 2$) : $\pm 3$ jours.
5. **Fenêtre fertile** :
   La durée de vie moyenne des spermatozoïdes est de 5 jours dans la glaire fertile, celle de l'ovocyte de 24 heures.
   $$\text{Début fenêtre} = J_{ovu} - 5 \text{ jours} - \Delta$$
   $$\text{Fin fenêtre} = J_{ovu} + 1 \text{ jour} + \Delta$$

### 3.2 Niveau 2 : Modèle Statistique Multivarié (`StatisticalEstimator` - Phase 4)
Combine les observations quotidiennes pour recalculer dynamiquement la position :
- **Pic de LH (Test d'ovulation)** : Détection d'un test positif $\rightarrow$ ovulation projetée dans les 24 à 36 heures ($J_{ovu} = J_{test} + 1$). Confiance portée à `'eleve'`.
- **Courbe de température basale** : Détection du décalage thermique post-ovulatoire (+0.2°C à +0.4°C maintenu 3 jours) confirmant rétrospectivement l'ovulation.
- **Glaire cervicale** : Transition vers le type `'filant_blanc_oeuf'` signalant la période d'œstrogène maximale.
- **Formule de score statistique pondéré** :
  $$\text{Score}(t) = w_1 \cdot P_{calendaire}(t) + w_2 \cdot S_{glaire}(t) + w_3 \cdot S_{LH}(t) + w_4 \cdot S_{temp}(t)$$

### 3.3 Niveau 3 : Modèle Machine Learning Personnalisé (`MLFertilityEstimator` - Futur)
- Entraîné sur des séries temporelles de biomarqueurs après recueil du consentement explicite `entrainement_ml`.
- Déploiement sous forme d'API Python (FastAPI / Triton Inference Server).
- Sortie calibrée sous forme de distribution de probabilités continue par jour de cycle $P(\text{ovulation} = t)$.

---

## 4. Calcul du Niveau de Confiance (`ConfidenceService`)

Le niveau de confiance qualifie **la certitude de l'estimation fournie**, et non la chance de conception.

```text
Matrice de décision de la confiance (Niveau 1) :
-------------------------------------------------------------------------
Condition                                               Niveau attribué
-------------------------------------------------------------------------
Historique < 2 cycles                                    'faible'
Irrégularité déclarée ou écart-type σ > 4 jours           'faible'
2 à 5 cycles enregistrés ET écart-type σ ≤ 2 jours       'moyen'
≥ 6 cycles enregistrés ET écart-type σ ≤ 1.5 jour         'eleve'
Présence d'indicateur biologique convergent (LH/Glaire)  Majoration d'un cran
-------------------------------------------------------------------------
```

---

## 5. Moteur d'Explicabilité (`ExplanationService`)

Pour chaque prédiction, le service produit une liste de justifications compréhensibles par l'utilisatrice :

| Règle déclenchée | Facteur explicatif généré (Description) | Poids | Effet |
|---|---|---|---|
| Moyenne historique calculée | « Vos cycles durent en moyenne 29 jours (calculé sur vos 6 derniers cycles). » | 0.450 | `renforce` |
| Forte régularité constatée | « Vos cycles sont particulièrement réguliers (variation de moins d'un jour). » | 0.300 | `renforce` |
| Historique récent insuffisant | « Estimation basée sur vos informations de profil, vos cycles réels n'étant pas encore assez nombreux. » | 0.500 | `diminue` |
| Irrégularité statistique | « Votre cycle présente une variation de 5 jours, ce qui élargit la fenêtre d'incertitude. » | 0.350 | `diminue` |
| Test LH positif | « Le test d'ovulation positif indique un pic d'hormone LH imminent. » | 0.600 | `renforce` |

---

## 6. Versionnage et Traçabilité (`version_moteur_prediction`)

Toute prédiction enregistrée en base contient obligatoirement l'identifiant `version_moteur_id`. 
Exemple d'enregistrement dans la table de registre :

```json
{
  "numero_version": "v1.0-calendrier",
  "type_moteur": "regles_statistiques",
  "metriques_performance": {
    "precision_cible_jours": 2,
    "taux_couverture": "100%",
    "base_regles": "Luteal_Phase_14d_Standard"
  },
  "actif": true
}
```

Ce couplage permet ultérieurement de réaliser des tests A/B ou d'évaluer la précision rétrospective des prédictions lorsque les règles réelles surviennent.
