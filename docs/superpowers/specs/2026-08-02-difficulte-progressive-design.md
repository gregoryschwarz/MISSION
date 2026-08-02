# Difficulté progressive

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 2 sur 3 d'un ensemble de retours utilisateur (le premier, badges visuels, est livré). Actuellement, chaque mission génère toujours le même mélange fixe de questions, au niveau de difficulté recalibré pour un début de CE2 — sans jamais s'ajuster aux réussites ou difficultés réelles de l'enfant. Ce sous-projet ajoute une difficulté progressive : chaque type d'opération (addition, soustraction, multiplication, comparaison) a son propre palier, qui monte ou descend automatiquement selon les performances.

Le 3e sous-projet (variété de mini-jeux) sera traité séparément après celui-ci.

## Périmètre

- 3 paliers par type d'opération : **Début** (niveau actuel, recalibré CE2), **Confirmé**, **Avancé**.
- Plages numériques par palier :

| Type | Début (actuel) | Confirmé | Avancé |
|---|---|---|---|
| Addition | somme < 100 | somme < 200 | somme < 999 |
| Soustraction | < 100, sans retenue | < 200, sans retenue | < 999, avec retenue |
| Multiplication | tables ×2, ×5, ×10 | + ×3, ×4 | toutes les tables ×2 à ×10 |
| Comparaison | < 100 | < 500 | < 999 |

- **Règle d'ajustement**, appliquée par type à la fin de chaque mission, à partir du `breakdown` (déjà calculé) de cette mission : ≥80% de bonnes réponses sur ce type → palier +1 (sauf si déjà au palier 3) ; <50% → palier -1 (sauf si déjà au palier 1) ; entre les deux, aucun changement.
- Les nouveaux profils démarrent au palier 1 pour les 4 types.
- **Tableau de bord parent** : affiche le palier actuel (Début/Confirmé/Avancé) à côté du pourcentage de réussite déjà affiché pour chaque notion.

**Hors périmètre** : ajustement en temps réel pendant une mission, historique multi-sessions pour lisser l'ajustement (les deux approches alternatives écartées lors du brainstorming), nouveaux types de questions, mini-jeux.

## Détails techniques

- Nouveau champ Firestore sur `families/{familyId}/profile/data` : `difficultyLevels: { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 }`. Ajouté à l'initialisation du profil dans `src/parent/family.js` (`createFamily`) et au profil par défaut de secours dans `src/child/main.js` (`loadProfile`), pour les profils déjà existants qui n'ont pas encore ce champ (`profile.difficultyLevels ?? { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 }` au moment de la lecture).
- `src/child/questions.js` : chaque générateur (`generateAddition`, `generateSubtraction`, `generateMultiplication`, `generateComparison`) reçoit un paramètre `level` (1, 2 ou 3) et sélectionne la plage correspondante. `generateMission(count, difficultyLevels)` passe le palier du type concerné à chaque appel de générateur.
- Nouveau module partagé `src/shared/difficulty.js` (pur, testable) : une fonction `adjustDifficultyLevels(currentLevels, breakdown)` qui applique la règle d'ajustement à chaque type présent dans `breakdown` et retourne les nouveaux paliers.
- `src/child/main.js` : `startMission()` passe `lastProfile.difficultyLevels` (avec le repli par défaut) à `generateMission`. `finishMission()` calcule les nouveaux paliers via `adjustDifficultyLevels` et les inclut dans l'écriture Firestore du profil, aux côtés de l'XP/niveau/badges déjà sauvegardés en une seule fois.
- `src/parent/dashboard.js` : la section "Réussite par notion" affiche, pour chaque type, le pourcentage déjà calculé **et** le libellé du palier actuel (Début/Confirmé/Avancé), lu depuis `profile.difficultyLevels`.

## Gestion des erreurs

Aucune nouvelle surface d'erreur : le nouveau champ est un simple nombre entier dans un document déjà lu/écrit par l'app enfant et lu par l'app parent, sous les mêmes règles de sécurité Firestore qu'aujourd'hui.

## Tests

Tests Vitest sur `adjustDifficultyLevels` (montée à ≥80%, descente à <50%, stabilité entre les deux, plafond au palier 3, plancher au palier 1, types absents du breakdown restent inchangés) et sur les générateurs de questions recalibrés par palier (bornes correctes pour chaque type × chaque palier).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore (le champ `profile` est déjà lisible/écrivable par l'enfant et lisible par le parent, indépendamment de sa structure interne).
