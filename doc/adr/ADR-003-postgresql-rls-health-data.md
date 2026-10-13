# ADR-003 : Utilisation de PostgreSQL Row-Level Security (RLS) pour les Données de Santé
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Statut
Accepté

### Contexte
FertiliteApp manipule des données de santé reproductive extrêmement intimes. Une fuite de données inter-utilisatrices causée par un bug applicatif (ex. oubli d'une clause `WHERE utilisateur_id = :id`) constituerait une faute grave et une infraction majeure au RGPD.

### Décision
Activer **Row-Level Security (RLS)** sur toutes les tables de données personnelles sous PostgreSQL 15+. Chaque connexion NestJS associe l'identifiant utilisateur courant à la session SQL via `SET LOCAL app.utilisateur_id = '...'`.

### Conséquences
- **Avantages** :
  - Filet de sécurité au niveau du moteur SQL interdisant toute fuite inter-comptes même en cas d'erreur dans le code applicatif ;
  - Conformité native avec les exigences de sécurité des données de santé (HDS / RGPD).
- **Inconvénients** :
  - Nécessite d'encapsuler les requêtes dans une transaction pour que `SET LOCAL` s'applique de manière hermétique à la requête courante du pool.
