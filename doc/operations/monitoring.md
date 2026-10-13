# Observabilité, Journalisation & Monitoring — Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Principes d'Observabilité Sans Fuite de Données de Santé

Dans une application de santé reproductive, les journaux système (logs) ne doivent **jamais** contenir :
- Des adresses emails ou mots de passe en clair ;
- Des valeurs de biomarqueurs (dates de règles, température, glaire, notes de rapports) ;
- Les corps bruts des requêtes HTTP sur les routes d'observations.

Tous les logs sont structurés au format JSON via **Pino**, avec masquage automatique des champs sensibles.

---

## 2. Métriques Applicatives Clés (Prometheus)

| Métrique | Type | Description | Seuil d'Alerte |
|---|---|---|---|
| `http_request_duration_seconds` | Histogram | Latence des requêtes HTTP par route | P95 > 500 ms |
| `fertility_engine_calc_duration_ms` | Histogram | Temps de calcul du moteur d'estimation | P95 > 250 ms |
| `fertility_engine_calc_total` | Counter | Nombre d'estimations calculées par version | Décroissance anormale |
| `active_db_connections` | Gauge | Nombre de connexions PostgreSQL actives | > 80% du pool max |
| `audit_log_write_failures_total` | Counter | Échecs d'écriture dans `journal_acces` | > 0 (Alerte critique) |

---

## 3. Gestion des Incidents avec Sentry

- Initialisation de Sentry dans `main.ts` avec exclusion des données PII (`sendDefaultPii: false`) ;
- Regroupement des erreurs par empreinte contextuelle sans données d'utilisatrice dans l'erreur ;
- Alerte immédiate vers l'équipe d'astreinte en cas d'erreur $500$ persistante ou d'anomalie de calcul d'estimation.