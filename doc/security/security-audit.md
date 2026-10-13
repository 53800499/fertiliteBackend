# Sécurité, Audit & Conformité Données de Santé — Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

## 1. Principes de Protection des Données de Santé Reproductive

Les données relatives au cycle menstruel et à la fertilité constituent des données de santé à caractère personnel hautement sensibles au sens de l'article 9 du RGPD.

### Mesures appliquées :
1. **Minimisation** : Aucune donnée inutile n'est demandée (pas de nom de famille, pas d'adresse postale).
2. **Cloisonnement RLS** : Toute requête SQL est isolée au niveau ligne par la variable de session `app.utilisateur_id`.
3. **Hachage résistant aux attaques par dictionnaire** :
   - Mots de passe : **Argon2id** (paramètres : memoryCost = 65536 KiB, timeCost = 3, parallelism = 4) ;
   - Refresh tokens : Hachage SHA-256 avec sel applicatif avant stockage dans `session_authentification`.
4. **Chiffrement applicatif de bout en bout** :
   - Les notes intimes de la table `rapport_sexuel` sont chiffrées avec **AES-256-GCM** côté serveur avant d'être transmises à PostgreSQL en tant que `BYTEA`. La clé de chiffrement réside exclusivement dans un gestionnaire de secrets (KMS / Vault).

---

## 2. Le Registre d'Audit Immuable (`journal_acces`)

Toute lecture, création, modification, suppression ou export d'une donnée sensible déclenche une écriture automatique et non modifiable dans `journal_acces` :

```text
Action utilisateur / système
             │
             ▼
Intercepteur AuditAccessInterceptor
             │
             ▼
INSERT INTO journal_acces (
    utilisateur_cible_id, acteur_id, type_acteur, action,
    ressource_type, ressource_id, adresse_ip, resultat, date_action
) VALUES (...)
```

Cette table est partitionnée mensuellement et inaccessible en modification ou suppression (droits `INSERT` et `SELECT` uniquement pour l'application).
