# ADR-002 : Isolement du Fertility Engine derrière l'interface FertilityEstimator
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Statut
Accepté

### Contexte
Le calcul de fertilité est destiné à évoluer d'un algorithme de calendrier simple (Niveau 1) vers un modèle statistique multi-indicateurs (Niveau 2), puis vers un modèle de Machine Learning entraîné en Python (Niveau 3). Il est crucial que ces transitions n'impactent ni les routes d'API, ni les clients mobiles, ni la structure de persistance.

### Décision
Isoler complètement le moteur de fertilité derrière une interface TypeScript stricte : `FertilityEstimator`. Le moteur reçoit un `FertilityInput` normalisé et retourne un `FertilityPredictionOutput`. Le choix de l'implémentation (`CalendarEngine`, `StatisticalEngine`, `MLFertilityEstimator`) est dynamique ou configurable.

### Conséquences
- **Avantages** :
  - Interchangeabilité totale du moteur sans impacter les contrôleurs ou les modèles de cycle ;
  - Tests unitaires purs sans base de données ;
  - Extraction possible vers une API externe en modifiant uniquement une classe adaptateur.
- **Inconvénients** :
  - Nécessite une étape de mapping entre les entités TypeORM et les structures `FertilityInput`.
