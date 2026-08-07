# Notion problèmes (énoncés)

**Date :** 2026-08-07
**Statut :** Approuvé pour planification

## Contexte et objectif

Troisième sous-projet de la série géométrie → mesures → problèmes. Ajoute une 11ᵉ notion : des énoncés de problèmes en français ("Léa a 12 bonbons, elle en reçoit 5 de plus. Combien en a-t-elle en tout ?"), portant sur l'addition ou la soustraction. Contrairement aux 10 notions existantes (expressions numériques/symboliques courtes), c'est la première notion textuelle de l'app.

## Périmètre

- **Exercice** : un énoncé de problème est affiché, l'enfant répond avec le résultat numérique (addition ou soustraction sous-jacente).
- **Génération** : des gabarits de phrases avec valeurs variables (prénom + pronom associé, objet, deux nombres), pas de banque fixe — cohérent avec l'architecture "générateur pur" du reste de l'app.
- **Nombres réutilisés directement** des générateurs `generateAddition`/`generateSubtraction` existants (mêmes plages par niveau de difficulté), pas de nouvelle logique numérique.
- **Indice dynamique réutilisé** : le bouton "❓ Aide" affiche les mêmes étapes de calcul colonne par colonne que pour l'opération nue (addition ou soustraction selon l'énoncé), via le système d'indices déjà existant.
- **Intégration complète**, au même titre que les 10 notions existantes : difficulté adaptative par notion, badge de maîtrise, apparition dans le tableau de bord parent, fonctionnement dans les 3 formats de mission.
- **Compromis accepté** : dans la chasse aux paires, la tuile "calcul" affiche l'énoncé complet (plus long qu'une expression courte comme "5 + 3"), sans traitement CSS spécifique — choix validé par l'utilisateur.

**Hors périmètre** : multiplication/division dans les énoncés, problèmes à plusieurs étapes, raccourcissement de l'énoncé en QCM/chasse aux paires.

## Détails techniques

### `src/child/wordProblems.js` (nouveau, module pur)

```js
export const NAMES = [
  { name: 'Léa', pronoun: 'elle' },
  { name: 'Emma', pronoun: 'elle' },
  { name: 'Chloé', pronoun: 'elle' },
  { name: 'Tom', pronoun: 'il' },
  { name: 'Lucas', pronoun: 'il' },
  { name: 'Nathan', pronoun: 'il' },
];

export const OBJECTS = ['bonbons', 'billes', 'images', 'cartes de jeu', 'gommes', 'autocollants'];

export const ADDITION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en reçoit ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en trouve ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `Dans un panier, il y a ${a} ${object}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`,
];

export const SUBTRACTION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en donne ${b} à son ami. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `${name} avait ${a} ${object}. ${capitalize(pronoun)} en a perdu ${b}. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `Il y a ${a} ${object} dans une boîte. On en retire ${b}. Combien en reste-t-il ?`,
];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function wordProblemText(operation, a, b) {
  const { name, pronoun } = NAMES[randomInt(0, NAMES.length - 1)];
  const object = OBJECTS[randomInt(0, OBJECTS.length - 1)];
  const templates = operation === 'addition' ? ADDITION_TEMPLATES : SUBTRACTION_TEMPLATES;
  const template = templates[randomInt(0, templates.length - 1)];
  return template(name, pronoun, object, a, b);
}
```

(`randomInt` importé de `./random.js`, comme dans les autres modules du dossier `child/`.)

Le pronom accompagne chaque prénom dans le catalogue plutôt que d'être déduit — évite toute logique de détection de genre, et garantit un accord grammatical toujours correct ("elle en reçoit" / "il en reçoit").

### `src/child/questions.js` — nouveau générateur

```js
export function generateWordProblem(level = 1) {
  const operation = randomInt(0, 1) === 0 ? 'addition' : 'soustraction';
  const base = operation === 'addition' ? generateAddition(level) : generateSubtraction(level);
  const prompt = wordProblemText(operation, base.a, base.b);
  return { type: 'probleme', operation, a: base.a, b: base.b, answer: base.answer, prompt };
}
```

`GENERATORS.probleme = generateWordProblem`, ajouté en dernier dans le tableau `types` de `generateMission` (après `temps`), pour préserver les tests existants (même patron que géométrie/mesures).

Aucun champ `options` : réponse numérique, fonctionne avec la logique de distracteurs générique déjà en place dans `choices.js` (aucun changement requis là), et avec l'appariement par égalité de valeur déjà en place dans `pairsGame.js` (aucun changement requis là non plus — `'probleme'` n'entre pas dans `SYMBOLIC_ANSWER_TYPES`).

### `src/child/hints.js` — délégation de l'indice dynamique

Dans `dynamicHintSteps(question)`, ajout d'un cas avant le `default: return null` :

```js
case 'probleme':
  return question.operation === 'addition'
    ? additionHint(question.a, question.b)
    : subtractionHint(question.a, question.b);
```

### `src/shared/difficulty.js`, `progression.js`, `badges.js`, `helpContent.js`, `src/parent/dashboard.js`, `src/child/ui.js`

Même patron que géométrie/mesures :
- `DEFAULT_DIFFICULTY_LEVELS` gagne `probleme: 1`.
- `OPERATION_TYPES` gagne `'probleme'`.
- `BADGES` gagne `{ id: 'mastery-probleme', category: 'maitrise', emoji: '📖', label: 'Problèmes maîtrisés', gradient: [...] }` (couleurs choisies et vérifiées anti-collision au moment de l'implémentation, comme pour les notions précédentes).
- `HELP_TEXT` gagne une entrée générique complémentaire à l'indice dynamique (le texte générique reste affiché au-dessus des étapes chiffrées, comme c'est déjà le cas pour addition/soustraction).
- `NOTION_TYPES` (dashboard parent) gagne `'probleme'`.
- `FOCUS_LABELS` (bannière enfant) gagne `probleme: 'les problèmes'`.

Aucun changement dans le rendu visuel de `ui.js` (`renderQuestion`/`renderQuestionQcm`/`renderPairsRound`) : sans `shape`/`items`/type visuel particulier, `visualDisplayHtml` retourne déjà `''` pour ce type, et l'énoncé s'affiche via le `prompt` existant dans le `<h2>` (quiz/QCM) ou comme texte de tuile (chasse aux paires).

## Gestion des erreurs

Aucune nouvelle surface d'erreur : génération purement synchrone côté client. La positivité du résultat de soustraction est déjà garantie par `generateSubtraction` (invariant existant, testé), donc aucun garde-fou supplémentaire nécessaire.

## Tests

Tests Vitest sur `src/child/wordProblems.js` :
- `wordProblemText('addition', a, b)` retourne un texte non vide contenant `String(a)` et `String(b)`, pour plusieurs tirages.
- Idem pour `'soustraction'`.
- Le texte ne contient jamais de `{` ou `}` résiduel (garantit qu'aucun gabarit n'a un placeholder mal substitué).

Tests Vitest sur `generateWordProblem` (dans `tests/child/questions.test.js`) :
- `type` est toujours `'probleme'`.
- `operation` est toujours `'addition'` ou `'soustraction'`.
- `answer` correspond toujours à `a + b` (si addition) ou `a - b` (si soustraction).
- Le `prompt` contient bien les valeurs de `a` et `b`.

Tests Vitest sur `dynamicHintSteps` (dans `tests/child/hints.test.js`) :
- Pour une question `probleme` avec `operation: 'addition'`, retourne exactement le même résultat que `additionHint(a, b)`.
- Idem pour `'soustraction'` avec `subtractionHint(a, b)`.

Pas de test pour le rendu HTML, cohérent avec le reste du projet.

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
