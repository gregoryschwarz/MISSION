# Nouveaux types de questions

**Date :** 2026-08-04
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 2 sur 4 d'une nouvelle série de retours utilisateur (après badges de maîtrise, livré et déployé). Actuellement, l'app ne propose que 4 types de questions (addition, soustraction, multiplication, comparaison). Ce sous-projet ajoute deux nouveaux types — division et fraction — pour enrichir le contenu pédagogique sans changer l'architecture existante.

Les 2 sous-projets suivants (personnalisation avatar, vue de progression parent) seront traités séparément après celui-ci.

## Périmètre

- **Division** : toujours exacte (jamais de reste). Utilise les mêmes paliers de tables que la multiplication (palier 1 : ×2/×5/×10, palier 2 : + ×3/×4, palier 3 : toutes les tables ×2 à ×10), en tirant un dividende garanti divisible.
- **Fraction** : comparaison de deux fractions au même dénominateur (ex. "1/4 ___ 3/4"), réponse `>` ou `<` — même format d'interaction que le type "comparaison" existant (2 boutons, pas de champ numérique). Dénominateurs par palier : palier 1 → {2, 4}, palier 2 → {2, 4, 6}, palier 3 → {2, 4, 6, 8, 10}. Numérateurs toujours différents entre les deux fractions comparées (jamais d'égalité).
- **Génération de mission** : les 10 questions d'une mission piochent désormais à parts égales parmi 6 types (au lieu de 4).
- **Intégration complète** aux systèmes existants sans logique spécifique supplémentaire : difficulté adaptative par type, les 3 formats de mission (quiz classique, QCM éclair, chasse aux paires), tableau de bord parent ("Réussite par notion").
- **Badges de maîtrise** : 2 nouveaux badges (`mastery-division`, `mastery-fraction`), la catégorie "Maîtrise" passe de 4 à 6 médaillons.

**Hors périmètre** : division avec reste, simplification/équivalence de fractions, nouveaux formats de mission, changement de la logique d'ajustement de difficulté elle-même.

## Détails techniques

### `src/child/questions.js`

```js
export function generateDivision(level = 1) {
  const tables = MULTIPLICATION_TABLES_BY_LEVEL[level] ?? MULTIPLICATION_TABLES_BY_LEVEL[1];
  const table = tables[randomInt(0, tables.length - 1)];
  const factor = randomInt(1, 10);
  const dividend = table * factor;
  return { type: 'division', a: dividend, b: table, answer: factor, prompt: `${dividend} ÷ ${table}` };
}

const FRACTION_DENOMINATORS_BY_LEVEL = {
  1: [2, 4],
  2: [2, 4, 6],
  3: [2, 4, 6, 8, 10],
};

export function generateFraction(level = 1) {
  const denominators = FRACTION_DENOMINATORS_BY_LEVEL[level] ?? FRACTION_DENOMINATORS_BY_LEVEL[1];
  const denominator = denominators[randomInt(0, denominators.length - 1)];
  let numeratorA = randomInt(1, denominator - 1);
  let numeratorB = randomInt(1, denominator - 1);
  while (numeratorB === numeratorA) numeratorB = randomInt(1, denominator - 1);
  const answer = numeratorA > numeratorB ? '>' : '<';
  return {
    type: 'fraction',
    a: { numerator: numeratorA, denominator },
    b: { numerator: numeratorB, denominator },
    answer,
    prompt: `${numeratorA}/${denominator} ___ ${numeratorB}/${denominator}`,
    options: ['>', '<'],
  };
}
```

`GENERATORS` gagne `division: generateDivision, fraction: generateFraction`. `generateMission`'s `types` array passe de `['addition', 'soustraction', 'multiplication', 'comparaison']` à `['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction']` (le round-robin existant `types[i % types.length]` gère automatiquement 6 types au lieu de 4, aucune autre logique à changer).

Chaque fraction est garantie non triviale (`numerator` différent entre `a` et `b`, dénominateur commun donc jamais d'égalité) et toujours strictement entre 0 et 1 (`numerator < denominator`), cohérent avec le niveau CE2 visé.

### `src/shared/difficulty.js`

`DEFAULT_DIFFICULTY_LEVELS` gagne `division: 1, fraction: 1`. `adjustDifficultyLevels` n'a besoin d'aucune modification : elle itère déjà génériquement sur `Object.entries(breakdown)`, donc les 2 nouveaux types s'ajustent automatiquement dès que `breakdown` les contient.

### `src/child/session.js`

`createSession`'s objet `breakdown` initial gagne `division: { correct: 0, total: 0 }, fraction: { correct: 0, total: 0 }`.

### `src/child/choices.js`

`generateChoices` traite `fraction` exactement comme `comparaison` (retourne `['>', '<']` sans génération de distracteurs). `division` suit le chemin déjà générique des types numériques (distracteurs ±1-5 autour de la bonne réponse) — aucune condition spéciale nécessaire, seul le test `question.type === 'comparaison'` devient `question.type === 'comparaison' || question.type === 'fraction'`.

### `src/child/ui.js`

`renderQuestion`'s test `const isComparison = question.type === 'comparaison';` devient `const isComparison = question.type === 'comparaison' || question.type === 'fraction';` (affiche les 2 boutons `>`/`<` au lieu du champ numérique). `renderQuestionQcm` et `renderPairsRound` fonctionnent déjà de façon générique sur `question.type`/`prompt`/`answer` et n'ont besoin d'aucun changement.

### `src/shared/badges.js`

2 nouvelles entrées dans `BADGES`, catégorie `maitrise` : `mastery-division` (emoji ➗) et `mastery-fraction` (emoji 🍕, pizza coupée — visuel intuitif pour une fraction). `BADGES` passe de 10 à 12 entrées.

### `src/shared/progression.js`

`OPERATION_TYPES` passe de `['addition', 'soustraction', 'multiplication', 'comparaison']` à `['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction']`. `newlyMasteredTypes` fonctionne déjà génériquement sur cette liste.

### Tableau de bord parent, `src/parent/family.js`

Aucun changement de code : `aggregateBreakdown`/`renderDashboard` itèrent déjà génériquement sur les clés de `breakdown`/`difficultyLevels`, et `DEFAULT_DIFFICULTY_LEVELS` (déjà importé tel quel dans `createFamily`) inclura automatiquement `division`/`fraction` une fois `difficulty.js` mis à jour.

## Gestion des erreurs

Aucune nouvelle surface d'erreur : mêmes formes de données (`breakdown`, `difficultyLevels`, `badges`) déjà lues/écrites sous les mêmes règles de sécurité Firestore.

## Tests

Tests Vitest sur :
- `generateDivision` : toujours une division exacte (`a % b === 0` et `answer * b === a`) pour chaque palier, table issue du bon ensemble par palier.
- `generateFraction` : dénominateur issu du bon ensemble par palier, numérateurs toujours différents, réponse `>`/`<` cohérente avec la comparaison réelle des numérateurs, `options` toujours `['>', '<']`.
- `generateMission` : les 6 types apparaissent tous sur un échantillon suffisant d'appels.
- `generateChoices` : `fraction` renvoie `['>', '<']` comme `comparaison` ; `division` génère des distracteurs valides comme les autres types numériques.
- `newlyMasteredTypes`/`BADGES` : couvrent bien les 6 types après mise à jour.

Pas de nouveau test pour `adjustDifficultyLevels`/`aggregateBreakdown` (déjà génériques, couverts par les tests existants).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
