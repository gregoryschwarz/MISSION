# Choix de notion par l'enfant

**Date :** 2026-08-07
**Statut :** Approuvé pour planification

## Contexte et objectif

Aujourd'hui, une mission mélange automatiquement toutes les notions connues (round-robin dans `generateMission`, avec une option de "priorité" de 70% réglée par le parent depuis le tableau de bord — `focusType`). L'utilisateur souhaite que l'enfant puisse elle-même, avant de lancer une mission, choisir une seule notion sur laquelle s'entraîner (ex. uniquement de la géométrie), plutôt que de toujours recevoir un mélange.

Sous-projet indépendant des séries "notion géométrie" / "mesures" en cours — ne touche à aucune notion elle-même, seulement à la façon dont une mission est composée et lancée.

## Périmètre

- Sur l'écran d'accueil enfant, un nouveau bouton **"🎯 Choisir une notion"**, à côté du bouton existant "✨ Mission du jour" (qui garde son comportement actuel : mélange de toutes les notions).
- Ce bouton ouvre un nouvel écran listant toutes les notions connues (un bouton par notion : emoji + nom), plus un bouton "Retour".
- Choisir une notion lance immédiatement une mission de 10 questions, **toutes de cette notion**, au niveau de difficulté actuel de l'enfant pour cette notion précise.
- Le choix est **ponctuel** : rien n'est mémorisé. À chaque retour à l'accueil, l'enfant peut choisir librement, mission après mission.
- Le format de la mission (quiz classique / QCM / chasse aux paires) reste tiré au hasard comme aujourd'hui — aucun changement à cette logique.
- Difficulté adaptative, badges de maîtrise, apparition dans le tableau de bord parent : tout continue de fonctionner sans aucune modification, puisque ces mécanismes raisonnent déjà génériquement par notion à partir de `session.breakdown`.

**Hors périmètre** : mémoriser le dernier choix entre deux sessions, choisir plusieurs notions à la fois pour une même mission, changer le format de mission.

## Détails techniques

### `src/child/questions.js` — nouvelle fonction et export ciblé

```js
export const QUESTION_TYPES = Object.keys(GENERATORS);

export function generateSingleTypeMission(count, type, level = 1) {
  const generator = GENERATORS[type] ?? GENERATORS.addition;
  return Array.from({ length: count }, () => generator(level));
}
```

Placé juste après la définition de `GENERATORS`. `QUESTION_TYPES` est la liste canonique des identifiants de notion connus (`['addition', 'soustraction', ..., 'geometrie', ...]`, et inclura automatiquement `monnaie`/`longueur`/`temps` une fois le sous-projet "mesures" fusionné, sans changement supplémentaire ici). C'est une petite amélioration ciblée : elle donne au nouvel écran de choix une source unique, plutôt que d'ajouter une 7ᵉ liste dupliquée du même ensemble de notions (déjà répété dans `difficulty.js`, `progression.js`, `helpContent.js`, `dashboard.js`, `ui.js`).

`generateSingleTypeMission` retombe sur `generateAddition` si un type inconnu est passé (garde-fou simple, cohérent avec le repli déjà utilisé ailleurs dans le fichier comme `shapes.js`'s `shapeSides`).

### `src/child/ui.js` — nouvel écran et bouton d'accueil

Nouvelle fonction exportée :

```js
export function renderNotionPicker(root, { types, onSelect, onBack }) {
  root.innerHTML = `
    <div class="screen notion-picker-screen">
      <h1>Choisis une notion</h1>
      ${types
        .map((type) => `<button class="big-button notion-btn" data-type="${type}">${emojiForType(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}</button>`)
        .join('')}
      <button id="notion-picker-back" class="big-button">Retour</button>
    </div>
  `;
  root.querySelectorAll('.notion-btn').forEach((btn) =>
    btn.addEventListener('click', () => onSelect(btn.dataset.type))
  );
  root.querySelector('#notion-picker-back').addEventListener('click', onBack);
}
```

Réutilise la classe CSS existante `.big-button` (déjà `width: 100%`, empilable) — aucune nouvelle règle CSS nécessaire. La capitalisation du nom de notion reprend exactement le même patron que `dashboard.js`'s `capitalize()` (utilisé pour le sélecteur de priorité parent), en inline plutôt qu'en import croisé enfant/parent.

`renderHome` gagne un second bouton, juste après "✨ Mission du jour" :

```js
<button id="choose-notion" class="big-button">🎯 Choisir une notion</button>
```

avec un nouveau callback `onChooseNotion` dans les props de `renderHome`, câblé comme les autres boutons existants (`onStartMission`, `onCustomize`).

### `src/child/main.js` — orchestration

```js
function showNotionPicker() {
  renderNotionPicker(root, {
    types: QUESTION_TYPES,
    onSelect: startMission,
    onBack: () => renderHomeScreen(lastProfile),
  });
}
```

`startMission` gagne un paramètre optionnel `notionType` :

```js
function startMission(notionType = null) {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  const questions = notionType
    ? generateSingleTypeMission(MISSION_LENGTH, notionType, difficultyLevels[notionType] ?? 1)
    : generateMission(MISSION_LENGTH, difficultyLevels, lastProfile?.focusType ?? null);
  session = createSession(questions);
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

`renderHomeScreen` passe `onChooseNotion: showNotionPicker` en plus des callbacks existants. Le bouton "✨ Mission du jour" continue d'appeler `onStartMission` (= `startMission`, appelé sans argument, donc `notionType` reste `null` et le comportement actuel — mélange habituel — est inchangé).

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : la génération de mission reste purement synchrone côté client, comme aujourd'hui. Un `notionType` invalide (ne devrait jamais arriver puisque les boutons sont générés à partir de `QUESTION_TYPES`) retombe silencieusement sur `generateAddition` via le garde-fou de `generateSingleTypeMission`.

## Tests

Tests Vitest sur `generateSingleTypeMission` et `QUESTION_TYPES` (dans `tests/child/questions.test.js`) :
- `QUESTION_TYPES` correspond exactement à `Object.keys(GENERATORS)` (donc à la liste réelle des notions enregistrées, quel que soit leur nombre au moment du test).
- `generateSingleTypeMission(count, type)` retourne bien `count` questions, toutes de `type` demandé.
- Le niveau de difficulté est bien transmis au générateur (même style de test que les autres vérifications de transmission de niveau dans `generateMission`).
- Un type inconnu retombe sur `generateAddition`.

Pas de test pour `renderNotionPicker`, le bouton d'accueil, ou le câblage dans `main.js` — cohérent avec le reste du projet (DOM/orchestration non testés).

## Déploiement

Sous-projet indépendant, sur sa propre branche depuis `master`. Comme il touche `ui.js`, `main.js` et `questions.js` — des fichiers également modifiés par le sous-projet "mesures" en cours — je recommande de terminer et fusionner "mesures" d'abord, puis de créer cette branche depuis le `master` à jour (ce qui donne aussi `QUESTION_TYPES` avec les 10 notions dès le départ, sans travail supplémentaire). Même processus de déploiement que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`.
