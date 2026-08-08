# Français — accord singulier/pluriel

**Date :** 2026-08-08
**Statut :** Approuvé pour planification

## Contexte et objectif

Premier sous-projet de la matière "Français" pour "Missions d'Ambre" — la première matière hors mathématiques de l'app. Jusqu'ici, l'app ne couvre que les maths (11 notions, toutes mélangées dans une mission via `generateMission`). Ce sous-projet ajoute une notion de français (accord singulier/pluriel d'un nom), dans une section entièrement séparée des missions maths : une mission ne mélange jamais calcul et grammaire.

## Périmètre

- **Exercice** : un mot est affiché dans une forme (singulier ou pluriel), l'enfant choisit la bonne forme opposée parmi 3 propositions (QCM).
- **Banque de mots**, progressive par niveau de difficulté :
  - Niveau 1 : pluriels réguliers en -s (ex. "un chat" → "des chats").
  - Niveau 2 : + pluriels en -x (ex. "un cheval" → "des chevaux").
  - Niveau 3 : + mots invariables (ex. "une souris" → "des souris") — le piège le plus fin, la forme ne change pas.
- **Séparation stricte des missions** : un nouveau bouton "📚 Mission Français" sur l'écran d'accueil, distinct de "✨ Mission du jour" (maths) et "🎯 Choisir une notion" (maths). Une mission française ne contient jamais de question de maths, et vice-versa.
- **Infrastructure partagée** avec les notions maths pour tout ce qui n'est pas la composition de la mission : difficulté adaptative par notion, badge de maîtrise, aide contextuelle, apparition dans le tableau de bord parent (répartition par notion, heat-map hebdomadaire) — le parent voit une vue d'ensemble unifiée maths + français.

**Hors périmètre** : homophones grammaticaux, mots invariables comme sous-domaine séparé, conjugaison, vocabulaire (sous-projets suivants), mélange de plusieurs sous-domaines français dans une même mission (un seul type existe pour l'instant), priorité de révision ("focusType") pour le français — pas de sens tant qu'il n'y a qu'un seul type français, à réévaluer quand un 2ᵉ type français existera.

**Décision de scoping explicite** : `accord-pluriel` n'est **pas** ajouté à `NOTION_TYPES` (le sélecteur de priorité du tableau de bord parent), pour éviter une option qui n'aurait aucun effet réel (le mécanisme `focusType` ne s'applique qu'aux missions maths). Il apparaît en revanche automatiquement dans "Réussite par notion" et la heat-map hebdomadaire, qui sont déjà génériques (`Object.keys(session.breakdown)`).

## Détails techniques

### `src/child/frenchQuestions.js` (nouveau module pur)

```js
import { randomInt, shuffle } from './random.js';

export const REGULAR_WORDS = [
  { singular: 'un chat', plural: 'des chats' },
  { singular: 'une table', plural: 'des tables' },
  { singular: 'un livre', plural: 'des livres' },
  { singular: 'une fleur', plural: 'des fleurs' },
  { singular: 'un ami', plural: 'des amis' },
  { singular: 'une pomme', plural: 'des pommes' },
];

export const X_PLURAL_WORDS = [
  { singular: 'un cheval', plural: 'des chevaux' },
  { singular: 'un chou', plural: 'des choux' },
  { singular: 'un oiseau', plural: 'des oiseaux' },
  { singular: 'un bijou', plural: 'des bijoux' },
  { singular: 'un jeu', plural: 'des jeux' },
  { singular: 'un genou', plural: 'des genoux' },
];

export const INVARIABLE_WORDS = [
  { singular: 'une souris', plural: 'des souris' },
  { singular: 'un nez', plural: 'des nez' },
  { singular: 'une croix', plural: 'des croix' },
  { singular: 'un tapis', plural: 'des tapis' },
];

const WORDS_BY_LEVEL = {
  1: REGULAR_WORDS,
  2: [...REGULAR_WORDS, ...X_PLURAL_WORDS],
  3: [...REGULAR_WORDS, ...X_PLURAL_WORDS, ...INVARIABLE_WORDS],
};

export function generateAccordPluriel(level = 1) {
  const words = WORDS_BY_LEVEL[level] ?? WORDS_BY_LEVEL[1];
  const word = words[randomInt(0, words.length - 1)];
  const askPlural = randomInt(0, 1) === 0;
  const given = askPlural ? word.singular : word.plural;
  const answer = askPlural ? word.plural : word.singular;
  const prompt = askPlural
    ? `Quel est le pluriel de "${given}" ?`
    : `Quel est le singulier de "${given}" ?`;
  const distractors = new Set();
  while (distractors.size < 2) {
    const other = words[randomInt(0, words.length - 1)];
    const candidate = askPlural ? other.plural : other.singular;
    if (candidate !== answer) distractors.add(candidate);
  }
  return {
    type: 'accord-pluriel',
    given,
    answer,
    prompt,
    options: shuffle([answer, ...distractors]),
  };
}

const FRENCH_GENERATORS = {
  'accord-pluriel': generateAccordPluriel,
};

export const FRENCH_TYPES = Object.keys(FRENCH_GENERATORS);

export function generateFrenchMission(count = 10, difficultyLevels = {}) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = FRENCH_TYPES[i % FRENCH_TYPES.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(FRENCH_GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

Les distracteurs sont pris parmi les vraies formes (singulier/pluriel) d'autres mots de la banque — toujours des mots français plausibles, jamais une forme inventée. `options` place cet exercice dans le même mécanisme "à choix fixes" déjà généralisé pour comparaison/longueur/temps/problèmes (`Array.isArray(question.options)`) : **aucun changement requis dans `ui.js` ni `choices.js`**, le rendu (quiz classique à boutons, QCM, chasse aux paires) et la génération de distracteurs QCM fonctionnent déjà génériquement.

`generateFrenchMission` suit le même patron round-robin que `generateMission`, mais pioche exclusivement dans `FRENCH_GENERATORS` — un type français ne peut jamais se retrouver dans une mission maths, et réciproquement. Pas de paramètre `focusType` pour l'instant (hors périmètre).

### `src/child/main.js` — nouveau point d'entrée

```js
function startFrenchMission() {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  session = createSession(generateFrenchMission(MISSION_LENGTH, difficultyLevels));
  lastFeedback = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}
```

Réutilise `createSession`, `pickMissionMode`, `createPairsRound`, `showQuestion`, `showPairsRound`, `finishMission` tels quels — aucun de ces éléments n'a besoin de savoir si la mission est maths ou français, ils raisonnent déjà génériquement sur `session.breakdown`/`session.questions`. `renderHome` gagne un bouton "📚 Mission Français" câblé sur `onStartFrenchMission: startFrenchMission`.

### `src/child/session.js`, `src/shared/difficulty.js`, `progression.js`, `badges.js`, `helpContent.js`

Même patron que chaque notion maths précédente :
- `session.js`'s `createSession`'s `breakdown` gagne `'accord-pluriel': { correct: 0, total: 0 }`.
- `DEFAULT_DIFFICULTY_LEVELS` gagne `'accord-pluriel': 1`.
- `OPERATION_TYPES` (détection de maîtrise) gagne `'accord-pluriel'`.
- `BADGES` gagne un badge `mastery-accord-pluriel` (emoji à définir à l'implémentation, ex. 🔤 ou ✏️ — vérification anti-collision de couleur comme pour chaque badge précédent).
- `HELP_TEXT` gagne une entrée générique expliquant la règle de base (ajouter -s, sauf mots en -x ou invariables).

### `src/parent/dashboard.js`

**Aucun changement à `NOTION_TYPES`** (décision de scoping ci-dessus). `aggregateBreakdown`/`weeklyBreakdownByType` affichent déjà `accord-pluriel` automatiquement, sans modification.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : génération purement synchrone côté client, comme les autres notions.

## Tests

Tests Vitest sur `src/child/frenchQuestions.js` :
- `generateAccordPluriel` : le niveau restreint bien la banque de mots utilisée (niveau 1 = seulement `REGULAR_WORDS`, niveau 3 = les trois banques) ; `answer` correspond toujours à la vraie forme opposée du mot tiré ; `options` contient toujours `answer` et exactement 3 valeurs uniques ; `type` est toujours `'accord-pluriel'`.
- `generateFrenchMission` : retourne bien `count` questions, toutes de type `'accord-pluriel'` (le seul type français existant) ; le niveau de difficulté est bien transmis.

Pas de test pour le rendu HTML ni pour `startFrenchMission` dans `main.js`, cohérent avec le reste du projet (DOM/orchestration non testés).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
