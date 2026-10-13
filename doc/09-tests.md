# 09 — Stratégie de Tests Backend
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Stratégie & suites de tests backend
- **Outils** : Jest, Supertest, Testcontainers (PostgreSQL 15), k6 (tests de charge)
- **Date** : 24 septembre 2026

---

## 1. Pyramide des Tests Backend

La criticité des données de santé reproductive et l'exigence d'explicabilité imposent une rigueur de test absolue :

```text
                     /\
                    /  \
                   / E2E\           Tests E2E (Supertest + Base réelle)
                  /------\          Couverture des flux transversaux (Auth -> Saisie -> Notif)
                 /        \
                /  Intégr. \        Tests d'Intégration (Controllers + Services + Repositories)
               /------------\       Testcontainers PostgreSQL avec RLS actif
              /              \
             /    Unitaires   \     Tests Unitaires Purs (Jest)
            /------------------\    100% de couverture de branches sur le Fertility Engine
```

---

## 2. Objectifs de Couverture de Code

| Composant | Couverture Lignes minimale | Couverture Branches minimale |
|---|---|---|
| **Fertility Engine** (`src/fertility/`) | **100%** | **100%** |
| **Services Métier** (`cycles`, `users`, `auth`) | **90%** | **85%** |
| **Intercepteurs & Guards** (`security`, `rls`) | **95%** | **90%** |
| **Contrôleurs HTTP** | **85%** | **80%** |

---

## 3. Jeux de Données de Test Physiologiques (Fixtures)

Pour valider le moteur d'estimation, une suite de scénarios cliniques représentatifs est formalisée dans `test/fixtures/fertility-scenarios.ts` :

### Scénario 1 : Cycle Standard Régulier (28 jours)
- **Données** : 6 cycles consécutifs de 28 jours ($\sigma = 0$).
- **Résultat attendu** :
  - Date d'ovulation : $J_{debut} + 14\text{ jours}$ ;
  - Marge d'incertitude : $\pm 1$ jour ;
  - Fenêtre fertile : $[J_{debut} + 8, J_{debut} + 16]$ ;
  - Niveau de confiance : `'eleve'` ;
  - Catégorie : `'elevee'` autour du jour 14.

### Scénario 2 : Cycle Long (35 jours)
- **Données** : 4 cycles consécutifs de 35 jours ($\sigma = 0$).
- **Résultat attendu** :
  - Date d'ovulation : $J_{debut} + 21\text{ jours}$ (application de la phase lutéale fixe de 14j : $35 - 14 = 21$) ;
  - Marge d'incertitude : $\pm 1$ jour ;
  - Niveau de confiance : `'eleve'`.

### Scénario 3 : Cycle Irrégulier (24 à 38 jours)
- **Données** : 6 cycles de durées $[24, 38, 26, 35, 29, 36]$ ($\sigma \approx 5.8$ jours).
- **Résultat attendu** :
  - Marge d'incertitude élargie : $\pm 3$ jours ;
  - Niveau de confiance : `'faible'` ;
  - Facteur explicatif généré signalant la forte dispersion ;
  - Pas de faux sentiment de certitude.

### Scénario 4 : Nouvelle Utilisatrice (0 cycle complet)
- **Données** : Déclaration de profil uniquement (durée habituelle déclarée = 30 jours, irrégularité déclarée = false).
- **Résultat attendu** :
  - Ovulation projetée à $J_{debut} + 16$ jours ;
  - Niveau de confiance forcé à `'faible'` ;
  - Facteur explicatif explicite : « Estimation basée sur vos déclarations de profil initiales ».

---

## 4. Exemple de Test Unitaire : `CalendarEngineSpec`

```typescript
// test/unit/fertility/calendar.engine.spec.ts
import { CalendarEngine } from '../../../src/fertility/engines/calendar.engine';
import { FertilityInput } from '../../../src/fertility/interfaces/fertility-input.interface';

describe('CalendarEngine (Niveau 1)', () => {
  let engine: CalendarEngine;

  beforeEach(() => {
    engine = new CalendarEngine();
  });

  it('devrait estimer l ovulation au jour 14 pour un cycle parfait de 28 jours', async () => {
    const input: FertilityInput = {
      userId: 'test-user-id',
      currentCycleStartDate: new Date('2026-10-01'),
      history: [
        { cycleId: 'c1', startDate: new Date('2026-07-09'), cycleLengthDays: 28 },
        { cycleId: 'c2', startDate: new Date('2026-08-06'), cycleLengthDays: 28 },
        { cycleId: 'c3', startDate: new Date('2026-09-03'), cycleLengthDays: 28 },
      ],
      observations: [],
    };

    const result = await engine.estimate(input);

    expect(result.estimatedOvulationDate).toEqual(new Date('2026-10-15'));
    expect(result.confidenceLevel).toBe('eleve');
    expect(result.uncertaintyMarginDays).toBe(1);
    expect(result.factors.length).toBeGreaterThanOrEqual(1);
    expect(result.factors[0].effectDirection).toBe('renforce');
  });

  it('devrait attribuer une confiance faible lorsque l historique est insuffisant', async () => {
    const input: FertilityInput = {
      userId: 'test-user-id',
      currentCycleStartDate: new Date('2026-10-01'),
      declaredCycleDurationDays: 30,
      history: [], // Aucun cycle terminé
      observations: [],
    };

    const result = await engine.estimate(input);

    expect(result.confidenceLevel).toBe('faible');
    expect(result.factors.some(f => f.description.includes('profil'))).toBe(true);
  });
});
```

---

## 5. Tests d'Intégration avec Testcontainers (PostgreSQL & RLS)

Les tests d'intégration valident l'étanchéité des politiques RLS sur un véritable conteneur PostgreSQL :

```typescript
// test/integration/rls-isolation.spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

describe('Vérification RLS Multi-Tenant', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('fertidb_test')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: [/* ... */],
      synchronize: false,
    });
    await dataSource.initialize();
    // Exécution des migrations DDL et activation RLS
  }, 30000);

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it('ne devrait pas permettre à l utilisatrice B de voir les cycles de l utilisatrice A', async () => {
    const runnerA = dataSource.createQueryRunner();
    const runnerB = dataSource.createQueryRunner();

    await runnerA.query("SET LOCAL app.utilisateur_id = '11111111-1111-1111-1111-111111111111'");
    await runnerA.query("INSERT INTO cycle (utilisateur_id, date_debut) VALUES ('11111111-1111-1111-1111-111111111111', '2026-09-01')");

    await runnerB.query("SET LOCAL app.utilisateur_id = '22222222-2222-2222-2222-222222222222'");
    const cyclesB = await runnerB.query("SELECT * FROM cycle");

    expect(cyclesB).toHaveLength(0); // RLS bloque physiquement la lecture
  });
});
```

---

## 6. Commandes d'Exécution

```bash
# Tests unitaires
npm run test

# Tests avec rapport de couverture
npm run test:cov

# Tests d'intégration et E2E
npm run test:e2e
```
