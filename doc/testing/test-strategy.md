# Plan de Validation & Matrice de Tests Détaillée — Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Matrice des Scénarios de Test du Fertility Engine

| ID Test | Cas Clinique | Données d'entrée | Comportement & Résultat Attendu |
|---|---|---|---|
| `TEST-FE-01` | Cycle parfait de 28j | 6 cycles consécutifs de 28 jours | Ovulation estimée à J14, confiance `'eleve'`, marge $\pm 1$ jour. |
| `TEST-FE-02` | Cycle court de 21j | 4 cycles consécutifs de 21 jours | Ovulation estimée à J7 ($21 - 14$), confiance `'eleve'`, marge $\pm 1$ jour. |
| `TEST-FE-03` | Cycle long de 36j | 5 cycles consécutifs de 36 jours | Ovulation estimée à J22 ($36 - 14$), confiance `'eleve'`, marge $\pm 1$ jour. |
| `TEST-FE-04` | Cycles très irréguliers | Durées : $[22, 38, 25, 34, 29, 36]$ | Marge élargie ($\pm 3$ jours), confiance `'faible'`, facteur explicatif d'irrégularité. |
| `TEST-FE-05` | Première utilisation | Profil déclaratif uniquement (30 jours) | Ovulation à J16, confiance forcée à `'faible'`, avertissement marge d'erreur. |
| `TEST-FE-06` | Test LH positif (V2) | Pic de LH détecté au jour 13 | Ovulation repositionnée à J14/J15 avec confiance relevée à `'eleve'`. |
| `TEST-FE-07` | Décalage thermique T° | Hausse de +0.3°C maintenue 3 jours | Confirmation a posteriori de l'ovulation passée. |

---

## 2. Tests de Charge et de Résilience (k6)

Scénario de test k6 (`test/load/fertility-load.js`) simulant l'injection de 500 requêtes concurrentes de recalcul d'estimation :
- **Critère de succès (Thresholds)** :
  - `http_req_duration{status:200}` : p(95) < 300ms ;
  - `http_req_failed` : < 0.01% ;
  - Utilisation CPU serveur : < 60%.
