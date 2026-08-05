# Personnalisation de l'avatar

**Date :** 2026-08-04
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 3 sur 4 d'une nouvelle série de retours utilisateur (après badges de maîtrise et nouveaux types de questions, tous deux livrés et déployés). Actuellement, l'avatar est une licorne 🦄 fixe, avec une aura CSS qui s'intensifie selon le niveau. Ce sous-projet ajoute des personnages et accessoires alternatifs, débloqués automatiquement selon la progression déjà en place (niveaux, badges), pour renforcer la motivation d'une enfant de 8 ans sans introduire de système de monnaie séparé.

Le sous-projet suivant (vue de progression parent) sera traité séparément après celui-ci.

## Périmètre

- **3 personnages**, débloqués par niveau d'avatar :
  - 🦄 Licorne — défaut, disponible dès le début.
  - 🦋 Papillon — débloqué au niveau 3.
  - 🐼 Panda — débloqué au niveau 5.
- **3 accessoires**, débloqués par badge (superposés au personnage actif) :
  - 👑 Couronne — badge `streak-30` (série de 30 jours).
  - ⭐ Étoile — premier badge de maîtrise obtenu, n'importe lequel des 6 types (`mastery-addition`, `mastery-soustraction`, `mastery-multiplication`, `mastery-comparaison`, `mastery-division`, `mastery-fraction`).
  - 🌸 Fleur — badge `perfect-10` (10 missions parfaites).
- **Déblocage automatique**, comme les badges — pas de monnaie à dépenser, l'XP cumulée continue de fonctionner exactement comme aujourd'hui pour le niveau.
- **Écran "Personnaliser"** accessible depuis l'accueil enfant : affiche les personnages et accessoires débloqués (sélectionnables) et verrouillés (grisés avec cadenas, même traitement visuel que les badges), avec un bouton retour.
- Le personnage et l'accessoire sélectionnés remplacent la licorne fixe sur l'écran d'accueil ; l'aura de niveau déjà existante continue de s'appliquer par-dessus, inchangée.

**Hors périmètre** : système de monnaie/boutique dépensable, personnages/accessoires supplémentaires au-delà de ce premier lot, animation ou interaction spécifique par personnage.

## Détails techniques

### `src/shared/avatarCustomization.js` (nouveau, module pur)

```js
export const CHARACTERS = [
  { id: 'unicorn', emoji: '🦄', requiredLevel: 1 },
  { id: 'butterfly', emoji: '🦋', requiredLevel: 3 },
  { id: 'panda', emoji: '🐼', requiredLevel: 5 },
];

const MASTERY_BADGE_IDS = [
  'mastery-addition',
  'mastery-soustraction',
  'mastery-multiplication',
  'mastery-comparaison',
  'mastery-division',
  'mastery-fraction',
];

export const ACCESSORIES = [
  { id: 'crown', emoji: '👑', requiresAnyOf: ['streak-30'] },
  { id: 'star', emoji: '⭐', requiresAnyOf: MASTERY_BADGE_IDS },
  { id: 'flower', emoji: '🌸', requiresAnyOf: ['perfect-10'] },
];

export const DEFAULT_CHARACTER = 'unicorn';
export const DEFAULT_ACCESSORY = null;

export function unlockedCharacters(avatarLevel) {
  return CHARACTERS.filter((c) => avatarLevel >= c.requiredLevel);
}

export function unlockedAccessories(badges) {
  return ACCESSORIES.filter((a) => a.requiresAnyOf.some((id) => badges.includes(id)));
}
```

`unlockedCharacters`/`unlockedAccessories` renvoient toujours au moins la licorne (puisque `requiredLevel: 1` est garanti dès le premier niveau) ; les accessoires peuvent renvoyer une liste vide (aucun badge pertinent encore obtenu), auquel cas l'écran de personnalisation montre les 3 accessoires verrouillés.

### Nouveaux champs Firestore

`profile.selectedCharacter` (chaîne, défaut `'unicorn'`) et `profile.selectedAccessory` (chaîne ou `null`, défaut `null`). Ajoutés à l'initialisation du profil dans `src/parent/family.js` (`createFamily`) et au profil de secours dans `src/child/main.js` (`loadProfile`), avec repli `profile.selectedCharacter ?? DEFAULT_CHARACTER` / `profile.selectedAccessory ?? DEFAULT_ACCESSORY` à la lecture pour les profils existants qui n'ont pas encore ces champs.

### `src/child/ui.js`

- `renderHome` affiche l'emoji du personnage sélectionné (au lieu de `🦄` fixe) avec, si un accessoire est sélectionné, son emoji superposé en overlay (coin haut-droit, positionnement CSS absolu). L'aura CSS (`auraClassForLevel`, inchangée) continue de s'appliquer sur le conteneur de l'avatar. Ajoute un bouton "🎨 Personnaliser" qui déclenche `onCustomize`.
- Nouvelle fonction `renderCustomize(root, { characters, accessories, selectedCharacterId, selectedAccessoryId, onSelectCharacter, onSelectAccessory, onBack })` : affiche une grille pour les personnages et une grille pour les accessoires, chacune listant tous les éléments du catalogue avec un état déverrouillé (cliquable, coché si sélectionné) ou verrouillé (grisé, cadenas 🔒, non cliquable) — réutilise le style visuel `.badge-medallion`/`.locked` déjà en place pour les badges. Un bouton "Retour" appelle `onBack`.

### `src/child/main.js`

- Nouvelle fonction `showCustomize()` : calcule `unlockedCharacters(lastProfile.avatarLevel)` et `unlockedAccessories(lastProfile.badges)`, les passe à `renderCustomize` avec la sélection courante du profil.
- `onSelectCharacter(characterId)` / `onSelectAccessory(accessoryId)` : mettent à jour `selectedCharacter`/`selectedAccessory` dans le profil et sauvegardent immédiatement via `saveProfile` (choix persistant indépendant de la fin d'une mission, pas de passage par `applyProgression`), puis ré-affichent l'écran de personnalisation avec la nouvelle sélection visible.
- `renderHomeScreen` passe désormais `selectedCharacter`/`selectedAccessory` (avec repli sur les valeurs par défaut) et `onCustomize: showCustomize` à `renderHome`.

### CSS (`src/child/style.css`)

Nouvelle règle pour le positionnement de l'accessoire en overlay sur l'avatar (`position: absolute`, coin supérieur droit, taille réduite par rapport au personnage). La grille de personnalisation réutilise `.badge-medallion`/`.locked`/`.badges-row` déjà stylés.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : mêmes règles de sécurité Firestore déjà en place, le profil (`selectedCharacter`/`selectedAccessory` inclus) est déjà lisible/écrivable par l'enfant.

## Tests

Tests Vitest sur `avatarCustomization.js` :
- `unlockedCharacters` : la licorne est toujours débloquée (niveau 1) ; papillon/panda apparaissent seulement à partir de leur niveau requis ; jamais de doublon.
- `unlockedAccessories` : liste vide si `badges` ne contient aucun id pertinent ; chaque accessoire apparaît dès que son critère `requiresAnyOf` est satisfait (au moins un id présent) ; l'étoile se débloque avec n'importe lequel des 6 badges de maîtrise, pas seulement le premier de la liste.

Pas de test pour le rendu HTML (`renderHome`/`renderCustomize`) ni pour le câblage `main.js`, cohérent avec le reste du projet (vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
