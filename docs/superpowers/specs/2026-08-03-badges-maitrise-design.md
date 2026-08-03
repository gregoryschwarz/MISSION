# Badges de maîtrise

**Date :** 2026-08-03
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 1 sur 4 d'une nouvelle série de retours utilisateur (après badges visuels, difficulté progressive et variété de mini-jeux, tous livrés et déployés). Actuellement, les seuls badges sont des badges de série (`streak-3/7/30`, calculés dans `src/shared/progression.js`). Ce sous-projet ajoute deux nouvelles familles de badges pour récompenser la progression réelle de l'enfant : la maîtrise d'une notion et la régularité de bonnes performances, indépendamment de la fréquence de jeu.

Les 3 sous-projets suivants (nouveaux types de questions, personnalisation avatar, vue de progression parent) seront traités séparément après celui-ci. Le mode "Contre-la-montre" reste hors de cette série.

## Périmètre

- **Badges de maîtrise** (4, un par type d'opération) : débloqué la première fois que ce type atteint le palier de difficulté "Avancé" (palier 3, système de difficulté progressive déjà en place). Permanent — reste acquis même si le palier redescend ensuite suite à de mauvaises performances.
- **Badges de missions parfaites** (3 paliers : 1 / 10 / 50) : débloqués selon le nombre cumulé de missions terminées à 100% de bonnes réponses (`correctCount === questionsTotal`), tous formats de mission confondus (quiz classique, QCM éclair, chasse aux paires).
- **Affichage groupé** : les médaillons sont désormais répartis en 3 rangées avec un titre — "Série", "Maîtrise", "Missions parfaites" — à la place de la rangée unique actuelle. Même emplacement (écran d'accueil enfant + tableau de bord parent).

**Hors périmètre** : nouveaux types de badges au-delà de ces deux familles, changement de la logique des badges de série existants, mode "Contre-la-montre".

## Détails techniques

### `src/shared/badges.js`

`BADGES` passe de 3 à 10 entrées, chacune avec un nouveau champ `category` (`'streak'` | `'maitrise'` | `'parfait'`) :

```js
export const BADGES = [
  { id: 'streak-3', category: 'streak', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', category: 'streak', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', category: 'streak', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
  { id: 'mastery-addition', category: 'maitrise', emoji: '➕', label: 'Addition maîtrisée', gradient: ['#a8e6cf', '#dcedc1'] },
  { id: 'mastery-soustraction', category: 'maitrise', emoji: '➖', label: 'Soustraction maîtrisée', gradient: ['#ffaaa5', '#ffd3b6'] },
  { id: 'mastery-multiplication', category: 'maitrise', emoji: '✖️', label: 'Multiplication maîtrisée', gradient: ['#a2d2ff', '#bde0fe'] },
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
  { id: 'perfect-10', category: 'parfait', emoji: '🌈', label: '10 missions parfaites', gradient: ['#ff9a8b', '#ff6a88'] },
  { id: 'perfect-50', category: 'parfait', emoji: '💎', label: '50 missions parfaites', gradient: ['#84fab0', '#8fd3f4'] },
];

export const BADGE_CATEGORIES = [
  { id: 'streak', label: 'Série' },
  { id: 'maitrise', label: 'Maîtrise' },
  { id: 'parfait', label: 'Missions parfaites' },
];
```

`renderBadgeMedallionsHtml(earnedBadgeIds)` est remplacée par une fonction qui produit les 3 rangées groupées, chacune précédée de son titre (`<h3>` ou équivalent), en réutilisant `badgeMedallionData` (inchangée) filtrée par `category`.

### `src/shared/progression.js`

- Nouvelle constante `PERFECT_MISSION_BADGES = [{ count: 1, id: 'perfect-1' }, { count: 10, id: 'perfect-10' }, { count: 50, id: 'perfect-50' }]`, sur le modèle de `STREAK_BADGES`.
- `applyProgression(profile, sessionSummary, nextDifficultyLevels)` reçoit un 3e paramètre : les paliers de difficulté **après** ajustement de cette mission (déjà calculés dans `main.js` via `adjustDifficultyLevels`, il suffit de réordonner l'appel pour le calculer avant `applyProgression` au lieu d'après).
- Nouvelle logique interne :
  - `previousDifficultyLevels` est dérivé à l'intérieur d'`applyProgression` via `profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS` (pas un paramètre séparé — `profile` le contient déjà).
  - `newlyMasteredTypes(previousDifficultyLevels, nextDifficultyLevels)` : renvoie les types dont le palier passe **strictement** à 3 alors qu'il n'y était pas avant (évite les faux positifs si le type était déjà à "Avancé" avant cette mission).
  - `perfectMissionsCount` : incrémenté de 1 si `sessionSummary.correctCount === sessionSummary.questionsTotal`, sinon inchangé.
  - Les nouveaux badges de maîtrise et de missions parfaites sont fusionnés avec les badges de série déjà calculés dans `newBadges`/`badges`, sur le même principe (pas de doublon si déjà acquis).
- `applyProgression` renvoie en plus `perfectMissionsCount` (nouvelle valeur à sauvegarder dans le profil).

### Nouveau champ Firestore

`profile.perfectMissionsCount` (entier, défaut `0`). Ajouté à l'initialisation du profil dans `src/parent/family.js` (`createFamily`) et au profil de secours dans `src/child/main.js` (`loadProfile`), avec repli `profile.perfectMissionsCount ?? 0` à la lecture pour les profils existants qui n'ont pas encore ce champ.

### `src/child/main.js`

Dans `finishMission()`, réordonner pour calculer `nextDifficultyLevels` **avant** l'appel à `applyProgression`, et le lui passer en 3e argument. `nextProfile` inclut désormais `perfectMissionsCount: progressionResult.perfectMissionsCount` en plus des champs déjà sauvegardés.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : même document Firestore `profile`, mêmes règles de sécurité déjà en place (le profil est déjà lisible/écrivable par l'enfant, lisible par le parent, indépendamment de sa structure interne).

## Tests

Tests Vitest sur :
- `progression.js` : un type passant de palier 1/2 à 3 déclenche son badge de maîtrise ; un type déjà à 3 avant la mission ne redéclenche pas le badge ; une mission à 100% incrémente `perfectMissionsCount` et déclenche le bon palier de badge parfait (1/10/50, pas de doublon) ; une mission non-parfaite n'incrémente pas le compteur.
- `badges.js` : le rendu groupé produit bien 3 rangées avec les bons médaillons par catégorie ; `badgeMedallionData` reste correcte avec les 10 entrées.

Pas de test pour le rendu HTML groupé lui-même au-delà de la structure des données (cohérent avec le reste du projet, vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
