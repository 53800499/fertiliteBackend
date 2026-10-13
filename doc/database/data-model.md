# Modèle de Données & Relations — Backend PostgreSQL
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Modèle Conceptuel de Données (MCD)

```text
  [utilisateur] 1,1 ─── (Possède) ─── 1,1 [profil_utilisateur]
        │
        ├── 1,1 ─── (Configure) ────── 1,1 [parametre_confidentialite]
        │
        ├── 1,n ─── (Historise) ────── 1,1 [consentement]
        │
        ├── 1,n ─── (Ouvre) ────────── 1,1 [session_authentification]
        │
        ├── 1,n ─── (Enregistre) ───── 1,1 [cycle] 1,1 ─── (Comprend) ─── 1,n [jour_regles]
        │                                  │
        ├── 1,n ─── (Mesure T°) ────── 1,1 [temperature_basale]
        │
        ├── 1,n ─── (Observe Glaire) ─ 1,1 [glaire_cervicale]
        │
        ├── 1,n ─── (Test LH) ──────── 1,1 [test_ovulation]
        │
        ├── 1,n ─── (Déclare) ──────── 1,1 [observation_symptome] 1,1 ── (Type) ── 1,n [type_symptome]
        │
        ├── 1,n ─── (Bénéficie) ────── 1,1 [prediction] 1,1 ── (Justifiée par) ── 1,n [facteur_explicatif]
        │                                  │
        │                                  └── 1,1 ── (Calculée par) ───── 1,n [version_moteur_prediction]
        │
        ├── 1,n ─── (Consulte) ─────── 1,1 [statistique_cycle]
        │
        ├── 1,n ─── (Reçoit) ───────── 1,1 [notification]
        │
        └── 1,n ─── (Souscrit) ─────── 1,1 [abonnement]
```

---

## 2. Règles d'Intégrité Référentielle

- `ON DELETE CASCADE` : Appliqué à toutes les tables où la donnée est strictement la propriété privée de l'utilisatrice (`profil_utilisateur`, `cycle`, `jour_regles`, `prediction`, etc.). En cas de suppression du compte, le droit à l'oubli est effectif sans données orphelines.
- `ON DELETE SET NULL` : Appliqué aux tables de traçabilité médico-légale (`journal_acces`) et de cohésion transversale (`prediction.cycle_id`).
- `RESTRICT / NO ACTION` : Appliqué aux tables de référence (`type_symptome`, `version_moteur_prediction`) afin d'interdire la suppression d'un élément déjà référencé dans l'historique d'une utilisatrice.
