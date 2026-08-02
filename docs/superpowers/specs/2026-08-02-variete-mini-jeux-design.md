# Variété de mini-jeux

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 3 sur 3 d'un ensemble de retours utilisateur (les deux premiers, badges visuels et difficulté progressive, sont livrés et déployés). Actuellement, chaque mission utilise toujours le même format d'interaction : un quiz de 10 questions à réponse tapée au clavier. Ce sous-projet ajoute de la variété dans la façon de pratiquer les mêmes notions mathématiques (addition, soustraction, multiplication, comparaison), sans toucher à la génération des questions ni à la difficulté adaptative déjà en place.

## Périmètre

- Trois formats de mission tournent en alternance :
  1. **Quiz classique** (existant, inchangé) — réponse tapée au clavier.
  2. **QCM éclair** — la question s'affiche avec 3 réponses possibles (la bonne + 2 distracteurs), l'enfant touche la bonne réponse au lieu de la taper. Pas de chronomètre.
  3. **Chasse aux paires** — une grille de 5 paires calcul/résultat (10 tuiles) s'affiche en une fois ; l'enfant touche un calcul puis un résultat pour former une paire.
- **Sélection du format** : à chaque lancement de mission, un format est tiré aléatoirement parmi les 3, à l'exclusion du format joué la fois précédente (alternance garantie, jamais deux fois de suite le même). Le dernier format joué est mémorisé dans `localStorage` de l'appareil (préférence locale, pas une donnée de progression Firestore).
- **Pas d'annonce préalable** : le format n'est jamais affiché à l'avance sur l'écran d'accueil ; il n'apparaît qu'au lancement de la mission (surprise totale).
- **QCM éclair — distracteurs** : pour addition/soustraction/multiplication, les 2 mauvaises réponses sont des écarts aléatoires proches de la bonne réponse (±1 à ±5), jamais négatives, jamais dupliquées entre elles ni avec la bonne réponse, puis les 3 choix sont mélangés. Pour comparaison, les choix restent `>` et `<` (déjà un format à 2 options, inchangé visuellement).
- **Chasse aux paires — comptage** : le tout premier essai d'appariement sur chaque tuile de calcul détermine si ce calcul compte comme correct ou incorrect dans le suivi par notion (`breakdown`). Les tentatives suivantes sur la même tuile (après une mauvaise association) ne recomptent pas. Une mauvaise association désélectionne les deux tuiles et l'enfant retente.
- **Difficulté adaptative inchangée** : quel que soit le format joué, les mêmes 10 questions sont générées via `generateMission` avec les paliers de difficulté actuels du profil, et le `breakdown` résultant alimente `adjustDifficultyLevels` exactement comme aujourd'hui.

**Hors périmètre** : mode "Contre-la-montre" (variante chronométrée, écartée lors du brainstorming — pourra être ajoutée plus tard comme 4e format si besoin), sélecteur de mode manuel par l'enfant, nouveaux types de questions, changement du schéma Firestore.

## Détails techniques

- **`src/child/missionMode.js`** (nouveau, module pur) : exporte `pickMissionMode(lastMode)`, qui choisit aléatoirement un format (`'quiz'`, `'qcm'`, ou `'pairs'`) parmi les 2 formats différents de `lastMode`. Exporte aussi `getLastMissionMode()` / `storeLastMissionMode(mode)`, lecture/écriture `localStorage`, sur le modèle de `src/child/sound.js` (préférence de son) et `src/child/pairing.js` (`getStoredFamilyId`/`storeFamilyId`).

- **`src/child/choices.js`** (nouveau, module pur) : exporte `generateChoices(question)`, qui renvoie un tableau de 3 chaînes/valeurs mélangées. Pour `addition`/`soustraction`/`multiplication` : génère 2 distracteurs distincts par écarts aléatoires ±1 à ±5 autour de `question.answer`, en excluant les valeurs négatives et les doublons (entre eux ou avec la bonne réponse), puis mélange les 3 valeurs. Pour `comparaison` : renvoie `['>', '<']` sans mélange (ordre déjà fixe dans l'UI actuelle).

- **`src/child/pairsGame.js`** (nouveau, module pur) : exporte `createPairsRound(questions)`, qui prend les 10 questions générées par `generateMission` et produit une structure `{ calcTiles, resultTiles }` — 10 tuiles calcul (une par question, avec son `prompt` et son `type`) et 10 tuiles résultat (les `answer` correspondants), chacune mélangée indépendamment avec un identifiant unique par tuile. Exporte aussi `attemptMatch(round, calcTileId, resultTileId)`, qui renvoie `{ isCorrect, firstAttempt }` — `isCorrect` compare les deux tuiles sélectionnées, `firstAttempt` indique si c'est la première tentative sur cette tuile de calcul (le round garde en mémoire quelles tuiles de calcul ont déjà eu un premier essai). Une fois toutes les paires trouvées, la mission est terminée.

- **`src/child/session.js`** (modifié) : `submitAnswer(session, answer)` actuel est conservé pour le format `quiz` et `qcm` (la comparaison `answer === question.answer` fonctionne identiquement, que la réponse vienne d'un champ tapé ou d'un bouton QCM). Une nouvelle fonction `recordAnswer(session, question, isCorrect)` factorise la mise à jour du `breakdown`/`correctCount`/`index` déjà présente dans `submitAnswer`, que `submitAnswer` appelle en interne après avoir calculé `isCorrect`. Le format `pairs` appelle `recordAnswer` directement avec le verdict déjà calculé par `attemptMatch` (uniquement quand `firstAttempt` est vrai, pour respecter la règle de comptage au premier essai). `isSessionComplete` et `finishSession` sont inchangés.

- **`src/child/ui.js`** (modifié) : ajoute `renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder })` (mêmes props que `renderQuestion` plus `choices`, boutons au lieu d'un champ texte) et `renderPairsRound(root, { round, index, total, onMatch, feedback, showPauseReminder })` (grille de tuiles calcul à gauche, tuiles résultat à droite, `onMatch(calcTileId, resultTileId)` appelé à chaque sélection d'une paire). `renderQuestion` existante est inchangée.

- **`src/child/main.js`** (modifié) : dans `startMission()`, appelle `pickMissionMode(getLastMissionMode())`, mémorise le nouveau format via `storeLastMissionMode`, génère la mission comme aujourd'hui via `generateMission`, puis stocke le format choisi avec la session. `showQuestion()` (renommée logiquement pour couvrir les 3 formats, ou routée en interne) affiche `renderQuestion`, `renderQuestionQcm` (avec `generateChoices`), ou `renderPairsRound` (avec `createPairsRound`, calculé une seule fois au début de la mission pour ce format) selon le format actif. `finishMission()` est inchangée : elle lit `summary.breakdown` de la même façon quel que soit le format joué.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : toute la logique de mission (génération, réponse, appariement) reste locale au device, comme aujourd'hui. Le seul écrit Firestore reste la sauvegarde de fin de mission (XP, badges, difficulté, session), identique quel que soit le format joué. `localStorage` pour le dernier format joué suit le même pattern de tolérance aux erreurs que les préférences existantes (son, familyId) — pas de vérification supplémentaire nécessaire.

## Tests

Tests Vitest sur :
- `pickMissionMode` : ne renvoie jamais le même format que `lastMode` ; sur de nombreux tirages, couvre les 2 formats restants ; gère `lastMode` absent/inconnu (renvoie un format valide parmi les 3).
- `generateChoices` : la bonne réponse est toujours présente ; les 3 valeurs sont distinctes ; aucune valeur négative ; pour `comparaison`, renvoie exactement `['>', '<']`.
- `pairsGame` : `createPairsRound` produit bien 10 tuiles calcul et 10 tuiles résultat correspondant aux questions fournies ; `attemptMatch` détecte correctement les bonnes/mauvaises paires ; `firstAttempt` est vrai uniquement lors du tout premier essai sur une tuile de calcul donnée, faux ensuite.
- `session.js` : `recordAnswer` alimente `breakdown`/`correctCount` identiquement que l'appel vienne de `submitAnswer` (quiz/QCM) ou directement du format `pairs`.

Pas de test pour le rendu HTML des nouveaux écrans (cohérent avec le reste du projet, vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore ni de schéma de données Firestore (le `breakdown` du document `sessions` garde exactement la même forme).
