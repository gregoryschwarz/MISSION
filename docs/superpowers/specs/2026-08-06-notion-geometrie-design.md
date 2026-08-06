# Notion géométrie (compter les côtés)

**Date :** 2026-08-06
**Statut :** Approuvé pour planification

## Contexte et objectif

Premier sous-projet d'une série de 3 (géométrie → mesures → problèmes) visant à élargir l'app au-delà des 6 notions de calcul actuelles (addition, soustraction, multiplication, comparaison, division, fraction). Ajoute une 7ᵉ notion : compter le nombre de côtés d'une forme géométrique affichée visuellement.

## Périmètre

- **Exercice** : une forme est affichée, l'enfant répond avec le nombre de côtés qu'elle a (réponse numérique, comme addition/soustraction/multiplication/division).
- **Catalogue de formes**, progressif par niveau de difficulté :
  - Niveau 1 : triangle (3), carré (4), cercle (0 — pas de côté droit)
  - Niveau 2 : + rectangle (4), losange (4)
  - Niveau 3 : + pentagone (5), hexagone (6)
- **Représentation visuelle** : formes dessinées en SVG inline (pas d'emoji — imprécis pour distinguer carré/rectangle).
- **Intégration complète**, au même titre que les 6 notions existantes :
  - 7ᵉ type dans la génération de mission (`generateMission`), y compris pour la priorité de révision (`focusType`).
  - Niveau de difficulté adaptatif par notion (comme les autres).
  - Badge de maîtrise `mastery-geometrie`.
  - Apparaît dans le tableau de bord parent (répartition par notion, tableau chaleur hebdomadaire — automatique, aucune modification requise là), et dans le sélecteur de priorité.
  - Texte d'aide générique dans l'écran "❓ Aide" — pas d'indice chiffré dynamique (compter des côtés ne se décompose pas en étapes de calcul comme les 4 opérations).
  - Fonctionne dans les 3 formats de mission (quiz classique, QCM, chasse aux paires).

**Hors périmètre** : nommer la forme, angles droits, formes irrégulières, mesures/problèmes (sous-projets suivants).

## Détails techniques

### `src/child/shapes.js` (nouveau, module pur)

```js
export const SHAPES = {
  cercle: { sides: 0, svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#a2d2ff"/></svg>' },
  triangle: { sides: 3, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="#ffb4a2"/></svg>' },
  carre: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" fill="#a8e6cf"/></svg>' },
  rectangle: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" fill="#ffe5a0"/></svg>' },
  losange: { sides: 4, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,50 50,90 10,50" fill="#cdb4db"/></svg>' },
  pentagone: { sides: 5, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,40 75,90 25,90 10,40" fill="#ff9a8b"/></svg>' },
  hexagone: { sides: 6, svg: '<svg viewBox="0 0 100 100"><polygon points="30,10 70,10 90,50 70,90 30,90 10,50" fill="#84fab0"/></svg>' },
};

export function shapeSvg(shapeId) {
  return SHAPES[shapeId]?.svg ?? '';
}

export function shapeSides(shapeId) {
  return SHAPES[shapeId]?.sides ?? 0;
}
```

### `src/child/questions.js` — nouveau générateur

```js
const GEOMETRY_SHAPES_BY_LEVEL = {
  1: ['triangle', 'carre', 'cercle'],
  2: ['triangle', 'carre', 'cercle', 'rectangle', 'losange'],
  3: ['triangle', 'carre', 'cercle', 'rectangle', 'losange', 'pentagone', 'hexagone'],
};

export function generateGeometry(level = 1) {
  const shapes = GEOMETRY_SHAPES_BY_LEVEL[level] ?? GEOMETRY_SHAPES_BY_LEVEL[1];
  const shape = shapes[randomInt(0, shapes.length - 1)];
  return { type: 'geometrie', shape, answer: shapeSides(shape), prompt: 'Combien de côtés a cette forme ?' };
}
```

`GENERATORS.geometrie = generateGeometry`, et `'geometrie'` s'ajoute au tableau `types` déjà présent dans `generateMission` (round-robin + priorité `focusType`).

Aucun changement nécessaire à `src/child/choices.js` (les distracteurs QCM génériques fonctionnent déjà pour une réponse numérique 0-6) ni à `src/child/pairsGame.js`'s `attemptMatch` (le type `geometrie` n'est pas dans `SYMBOLIC_ANSWER_TYPES`, donc l'appariement par valeur numérique s'applique déjà correctement). `createPairsRound` doit néanmoins transporter le champ `shape` sur chaque tuile de calcul (voir ci-dessous), sinon toutes les tuiles géométrie afficheraient le même texte de consigne.

### `src/child/pairsGame.js` — transporter le champ `shape`

`createPairsRound`'s `calcTiles.map` gagne `shape: q.shape` dans l'objet construit, en plus des champs existants (`id`, `pairKey`, `type`, `prompt`, `answer`) — `undefined` pour les types non-géométrie, sans effet sur eux.

### `src/child/ui.js` — affichage de la forme

`renderQuestion` et `renderQuestionQcm` affichent `shapeSvg(question.shape)` dans un conteneur dédié juste après le `<h2>${question.prompt}</h2>`, uniquement si `question.shape` est défini. `renderPairsRound`'s tuile de calcul affiche `shapeSvg(t.shape)` à la place de `t.prompt` quand `t.shape` est défini (sinon comportement inchangé).

### `src/shared/difficulty.js`, `src/shared/progression.js`, `src/shared/badges.js`

- `DEFAULT_DIFFICULTY_LEVELS` gagne `geometrie: 1`.
- `progression.js`'s `OPERATION_TYPES` gagne `'geometrie'` (détection de maîtrise).
- `badges.js`'s `BADGES` gagne `{ id: 'mastery-geometrie', category: 'maitrise', emoji: '📐', label: 'Géométrie maîtrisée', gradient: ['#c3aed6', '#e0c3fc'] }`.

### `src/shared/helpContent.js`

`HELP_TEXT` gagne une entrée générique (pas d'indice chiffré, `hints.js`'s `dynamicHintSteps` retourne déjà `null` par défaut pour tout type non reconnu — aucune modification requise là) :

```
geometrie: "Pour compter les côtés d'une forme, regarde combien de segments droits (lignes) forment son contour. Le cercle n'a aucun côté droit : c'est une ligne courbe, donc 0 côté."
```

### `src/parent/dashboard.js`

`NOTION_TYPES` (utilisé par le sélecteur de priorité de révision) gagne `'geometrie'`.

### `src/child/ui.js` — bannière de priorité

`FOCUS_LABELS` (déjà définie dans ce fichier, utilisée par `renderHome` pour la bannière d'accueil enfant quand une priorité est active) gagne `geometrie: 'la géométrie'`.

### CSS (`src/child/style.css`)

Nouvelle règle `.shape-display` (taille fixe, centrée, ex: 120px de large) pour le conteneur SVG dans les écrans de question et les tuiles de la chasse aux paires.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : génération purement synchrone côté client, comme les autres notions.

## Tests

Tests Vitest sur `src/child/shapes.js` :
- `shapeSides` retourne le bon nombre de côtés pour chaque forme du catalogue.
- `shapeSvg` retourne une chaîne non vide pour chaque forme connue, chaîne vide pour un id inconnu.

Tests Vitest sur `generateGeometry` (dans `tests/child/questions.test.js`) :
- Chaque niveau ne pioche que dans son sous-ensemble de formes autorisées.
- `answer` correspond toujours au nombre de côtés réel de la forme piochée (`shapeSides(shape)`).

Tests Vitest sur `createPairsRound` (dans `tests/child/pairsGame.test.js`) :
- Une tuile de calcul géométrie transporte bien le champ `shape`.

Pas de test pour le rendu HTML (`renderQuestion`/`renderQuestionQcm`/`renderPairsRound`), cohérent avec le reste du projet.

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
