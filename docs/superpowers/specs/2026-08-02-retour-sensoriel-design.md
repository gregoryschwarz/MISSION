# Retour sensoriel — sons, animations, avatar évolutif

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

L'application "Missions de Luna" (MVP déployé et testé de bout en bout) est fonctionnelle mais peu engageante visuellement : le feedback de réponse est uniquement textuel, l'avatar reste une licorne statique quel que soit le niveau, et il n'y a aucun son. Cette phase ajoute du retour sensoriel (sons, animations, avatar qui évolue visuellement) pour rendre l'expérience plus motivante pour une enfant de 8 ans, sans changer les mécaniques de jeu existantes (questions, scoring, progression, Firestore).

## Périmètre

- Sons courts générés programmatiquement (pas de fichiers audio à héberger) : bonne réponse, mauvaise réponse (neutre, jamais punitif), fin de mission.
- Bouton 🔊/🔇 pour couper le son, réglage mémorisé localement sur l'appareil.
- Avatar : halo/scintillement autour de la licorne dont la taille et la richesse des couleurs augmentent avec `avatarLevel` (déjà stocké en Firestore, aucune nouvelle donnée).
- Animation "pop" sur le texte de feedback (bonne/mauvaise réponse), synchronisée avec le son.
- Animation confettis (CSS pur) sur l'écran de résultats en fin de mission.

**Hors périmètre** : nouveaux mini-jeux, accessoires d'avatar à débloquer individuellement, personnalisation par l'enfant, musique de fond continue. Ces idées pourront être reprises plus tard si le besoin se confirme.

## Architecture technique

- **Aucun changement de données ni de règles Firestore** — tout est côté affichage (`src/child/ui.js`, `src/child/style.css`) plus un nouveau module autonome `src/child/sound.js`.
- **Sons** : Web Audio API (`AudioContext`, oscillateurs) pour générer des tonalités courtes à la volée — évite d'avoir à héberger/licencier des fichiers audio. Le réglage son on/off est stocké dans `localStorage` (clé `missionsDeLuna.soundEnabled`, valeur `"true"`/`"false"`, activé par défaut).
- **Avatar** : la taille/couleur du halo est calculée par une fonction pure `auraStyleForLevel(avatarLevel)` dans `sound.js` ou un nouveau petit module `avatar.js` (à trancher en écrivant le plan), qui retourne des valeurs CSS (ex. `box-shadow`, dégradé) appliquées à l'élément `.avatar` existant. Pas de nouvelle icône/emoji à gérer.
- **Animations** : classes CSS avec `@keyframes` (pop sur le feedback, confettis sur les résultats) — pas de librairie externe.

## Écrans et fonctionnalités concernés

### Écran d'accueil (`renderHome`)
- Ajout d'un bouton 🔊/🔇 (lit/écrit `localStorage`).
- L'avatar `.avatar` reçoit un style de halo calculé à partir de `avatarLevel`.

### Mission (`renderQuestion`)
- Sur chaque réponse (déjà géré par `main.js` → `feedback: 'correct'|'incorrect'`), jouer le son correspondant et ajouter une classe d'animation "pop" au message de feedback existant.

### Résultats (`renderResults`)
- Jouer le son de fin de mission (et un son supplémentaire si `leveledUp` ou nouveau badge, pour renforcer la récompense).
- Ajouter une animation confettis CSS sur l'écran.

## Gestion des erreurs

- Web Audio API peut être bloquée par les navigateurs tant qu'aucune interaction utilisateur n'a eu lieu (politique d'autoplay) — les sons ne sont déclenchés qu'en réaction à un clic/tap (réponse à une question, bouton mission), donc pas de blocage attendu. Si `AudioContext` échoue pour une raison quelconque (navigateur non supporté), l'erreur est silencieusement ignorée : le jeu doit rester jouable sans son plutôt que de planter.
- Le réglage son dans `localStorage` : si absent ou invalide, comportement par défaut = son activé.

## Tests

- Tests Vitest sur la fonction pure `auraStyleForLevel(avatarLevel)` (valeurs retournées selon les paliers de niveau).
- Pas de tests automatisés pour les sons eux-mêmes ni les animations CSS (vérification manuelle via le navigateur, comme pour le reste de l'UI dans ce projet).

## Déploiement

Même processus que le reste de l'app : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore, donc pas besoin de re-déployer `firestore:rules`.
