# Badges visuels

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 1 sur 3 d'un ensemble de retours utilisateur ("plus intéressante"). Les badges de série (`streak-3`, `streak-7`, `streak-30`, déjà calculés par `src/shared/progression.js`) sont actuellement affichés en texte brut : un compteur numérique ("X badges gagnés") côté enfant, une liste séparée par des virgules côté parent. Ce sous-projet leur donne une représentation visuelle (médaillons colorés) des deux côtés, sans toucher à la logique de progression.

Les deux sous-projets suivants (difficulté progressive, variété de mini-jeux) seront traités séparément après celui-ci.

## Périmètre

- Uniquement les 3 badges existants (série 3/7/30 jours) — pas de nouveaux types de badges.
- Un nouveau module partagé `src/shared/badges.js` définissant la liste des badges (id, emoji, libellé, couleurs) comme source unique de vérité, importé à la fois par le code enfant et le code parent.
- **Écran d'accueil enfant** (`renderHome`) : remplace le texte "X badges gagnés" par les 3 médaillons — coloré avec l'emoji du badge si gagné (présent dans `profile.badges`), grisé avec un cadenas 🔒 sinon.
- **Tableau de bord parent** (`renderDashboard`) : remplace la liste texte des badges par les mêmes médaillons.

**Hors périmètre** : nouveaux types de badges, logique de progression, schéma Firestore, règles de sécurité — tout inchangé.

## Détails techniques

`src/shared/badges.js` :
```js
export const BADGES = [
  { id: 'streak-3', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
];
```
Ces ids correspondent exactement à ceux déjà produits par `newlyEarnedBadges()` dans `src/shared/progression.js` — aucun changement là-bas.

Une fonction pure `renderBadgeMedallions(earnedBadgeIds)` (dans `badges.js` ou directement dans les fichiers d'UI, à trancher lors de l'écriture du plan) produit le HTML des 3 médaillons : dégradé de couleur + emoji si l'id est dans `earnedBadgeIds`, fond gris + 🔒 sinon.

`src/child/ui.js` (`renderHome`) et `src/parent/dashboard.js` (`renderDashboard`) importent `BADGES` et la logique de rendu pour afficher les médaillons à la place du texte actuel.

## Tests

Tests Vitest sur la logique pure de détermination verrouillé/débloqué (étant donné une liste de badges gagnés, quels médaillons sont actifs) — pas de test pour le rendu HTML lui-même (cohérent avec le reste du projet, vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
