# 12 — Spécifications Fonctionnelles Métier & Biologiques
## Application mobile d'estimation intelligente de la fertilité (FertiliteApp)

---

### Informations documentaires
- **Projet** : FertiliteApp
- **Composant** : Règles du domaine physiologique & Algorithmique fonctionnelle
- **Date** : 24 septembre 2026

---

## 1. Principes Biologiques Fondamentaux

Le Fertility Engine s'appuie sur la physiologie de la reproduction humaine :

```text
                  DÉROULEMENT DU CYCLE MENSTRUEL FÉMININ
                  
 Jour 1
   │
   ├── Phase Folliculaire (Durée variable, de 10 à 25+ jours)
   │   • Recrutement et maturation des follicules
   │   • Montée progressive des œstrogènes
   │   • Apparition de la glaire cervicale fertile
   │
   ├── OVULATION (Événement ponctuel : libération de l'ovocyte)
   │   • Déclenchée par le pic d'hormone lutéinisante (LH)
   │   • Durée de vie de l'ovocyte : 12 à 24 heures
   │
   └── Phase Lutéale (Durée remarquablement constante : 14 ± 2 jours)
       • Formation du corps jaune, sécrétion de progestérone
       • Hausse thermique basale (+0.2°C à +0.5°C)
       • Si pas de fécondation : régression du corps jaune et règles
```

### 1.1 La Fenêtre de Fertilité Clinique
La période biologique où un rapport peut déboucher sur une fécondation s'étend sur **6 jours maximum** :
- **5 jours avant l'ovulation** : correspond à la durée de survie maximale des spermatozoïdes dans les cryptes du col de l'utérus en présence d'une glaire cervicale filante de bonne qualité.
- **Le jour de l'ovulation ($J_{ovu}$)**.
- **1 jour après l'ovulation** : marge de sécurité couvrant les 24h de viabilité ovocytaire.

---

## 2. Règles Métier de Détection & de Classification

### 2.1 Détection de la Régularité du Cycle
Soit la série des durées des $N$ derniers cycles $\{D_1, D_2, \dots, D_N\}$ ($N \ge 3$) :
- **Moyenne** : $\mu = \frac{1}{N} \sum_{i=1}^N D_i$
- **Écart-type** : $\sigma = \sqrt{\frac{1}{N-1} \sum_{i=1}^N (D_i - \mu)^2}$
- **Étendue (Spread)** : $\Delta_D = \max(D) - \min(D)$

```text
Classification de régularité :
---------------------------------------------------------------------
Indice            Condition mathématique
---------------------------------------------------------------------
'regulier'        σ ≤ 2.0 jours ET ΔD ≤ 4 jours
'irregulier'      2.0 < σ ≤ 4.5 jours OU 4 < ΔD ≤ 8 jours
'tres_irregulier' σ > 4.5 jours OU ΔD > 8 jours
---------------------------------------------------------------------
```

### 2.2 Règle de Phase Lutéale Fixe
Contrairement à la croyance populaire qui situe toujours l'ovulation au 14ᵉ jour du cycle, l'ovulation se situe en réalité **14 jours avant les règles suivantes** :
- Pour un cycle de 28 jours : $28 - 14 = 14$ᵉ jour.
- Pour un cycle de 32 jours : $32 - 14 = 18$ᵉ jour.
- Pour un cycle de 24 jours : $24 - 14 = 10$ᵉ jour.

---

## 3. Score Continu de Fertilité & Catégories

Le score de fertilité $S(t) \in [0, 100]$ quantifie la probabilité relative de conception selon la position du jour $t$ par rapport au jour estimé d'ovulation $J_{ovu}$ :

```text
Courbe théorique de Wilcox (Probabilité quotidienne relative) :
- t < J_ovu - 5 : Score = 5%   ('faible')
- t = J_ovu - 5 : Score = 15%  ('faible')
- t = J_ovu - 4 : Score = 30%  ('moyenne')
- t = J_ovu - 3 : Score = 55%  ('moyenne')
- t = J_ovu - 2 : Score = 85%  ('elevee')
- t = J_ovu - 1 : Score = 95%  ('elevee')
- t = J_ovu     : Score = 80%  ('elevee')
- t = J_ovu + 1 : Score = 25%  ('faible' / 'moyenne')
- t > J_ovu + 1 : Score = 5%   ('faible')
```

```text
Seuils de Catégorisation :
---------------------------------------------------------------------
Catégorie          Intervalle du score continu
---------------------------------------------------------------------
'faible'           0.00 ≤ Score < 35.00
'moyenne'          35.00 ≤ Score < 70.00
'elevee'           70.00 ≤ Score ≤ 100.00
---------------------------------------------------------------------
```

---

## 4. Dictionnaire des Facteurs d'Explication

Chaque facteur explicatif répond à une logique médicale vulgarisée :

| Type Facteur | Condition Déclencheur | Libellé Restitué à l'Utilisatrice |
|---|---|---|
| `historique_cycles` | $\ge 3$ cycles enregistrés | « Vos 6 derniers cycles durent en moyenne {X} jours. » |
| `regularite` | `indice = 'regulier'` | « Vos cycles sont particulièrement stables (variation faible). » |
| `regularite` | `indice = 'irregulier'` | « La durée de vos cycles varie de {X} jours, ce qui élargit la fenêtre fertile estimée. » |
| `temperature_basale` | Hausse thermique validée | « La hausse de votre température basale confirme le passage de l'ovulation. » |
| `glaire_cervicale` | Glaire `'filant_blanc_oeuf'` | « La présence d'une glaire filante indique un pic de fertilité favorable. » |
| `test_ovulation` | Test LH `'positif'` ou `'pic'` | « Votre test urinaire d'ovulation indique un pic d'hormone LH. » |
