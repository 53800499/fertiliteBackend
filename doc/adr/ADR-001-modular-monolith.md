# ADR-001 : Choix du Modular Monolith plutôt que des Microservices
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Statut
Accepté

### Contexte
Pour le lancement de FertiliteApp, le système doit gérer l'authentification, les cycles, les indicateurs biologiques, le calcul de fertilité et les notifications. Deux approches architecturales étaient envisageables :
1. Découpage immédiat en microservices (Auth Service, Cycle Service, Fertility Service, Notification Service) ;
2. Monolithe Modulaire (Modular Monolith) avec NestJS.

### Décision
Nous choisissons le **Modular Monolith** avec NestJS. Les frontières de modules sont strictement définies et la communication entre domaines s'effectue via des interfaces typées et un bus d'événements interne (`@nestjs/event-emitter`).

### Conséquences
- **Avantages** :
  - Déploiement et observabilité simplifiés (un seul conteneur Docker en production) ;
  - Transactions ACID de base de données préservées sans recourir au pattern Saga distribué ;
  - Refactoring facilité sans casser d'APIs réseau internes.
- **Inconvénients** :
  - Nécessite une discipline stricte de développement pour interdire les imports directs de repositories entre modules.
