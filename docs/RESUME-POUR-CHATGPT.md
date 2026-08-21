# Missions d'Ambre — résumé complet du projet (pour transfert à un autre assistant IA)

> Document de synthèse généré le 11/08/2026, destiné à donner tout le contexte nécessaire à un autre assistant (ChatGPT ou autre) pour reprendre ce projet sans historique de conversation.

## 1. Qu'est-ce que c'est

Une PWA (Progressive Web App) de révision de mathématiques niveau CE2, en français, à usage strictement familial (pas de diffusion App Store / Play Store). Deux espaces :

- **Espace enfant** (`index.html`) : missions ludiques sur tablette, gamifiées (XP, niveaux, pièces, badges, avatar personnalisable).
- **Espace parent** (`parent.html`) : tableau de bord de suivi à distance, gestion des récompenses, missions ciblées.

Le nom de code technique interne du projet Firebase est `missions-de-luna` ; le nom affiché à l'utilisateur est **Missions d'Ambre** (changement de nom de produit fait après la création du projet Firebase — sans conséquence, un id de projet Firebase n'est pas renommable après coup).

## 2. Stack technique et décisions actées

- **Frontend** : Vite + JavaScript vanilla (aucun framework), deux pages (`index.html` enfant / `parent.html` parent).
- **Backend** : Firebase (Firestore + Authentication). Aucun serveur applicatif dédié.
- **Hébergement** : Firebase Hosting.
- **Tests** : Vitest, 338 tests au dernier passage complet.

Décisions actées et raisons :

- **On reste sur PWA + Firebase**, pas de migration vers une app mobile native (React Native/Expo + FastAPI + MongoDB) qui figurait dans le cahier des charges d'origine. Raison : usage familial uniquement, pas besoin de notifications push natives ni de présence sur les stores. Décision réversible si l'objectif change.
- **Génération des questions 100 % locale et déterministe** (`src/child/questions.js`, `src/child/frenchQuestions.js`), sans IA/LLM. Choix assumé pour la fiabilité mathématique garantie, l'absence de dépendance réseau et le fonctionnement hors-ligne.
- **Ne jamais lancer `firebase deploy` depuis un environnement sandbox Claude** : l'accès réseau aux API Google/Firebase (`*.googleapis.com`) y est bloqué, confirmé empiriquement (`curl` échoue avec l'erreur "connexion refusée" sur tous les endpoints testés). Le déploiement doit toujours se faire depuis la machine Windows de l'utilisateur.

## 3. Architecture du code

Dossier projet : `revision-maths-app` (racine du dépôt).

- `src/child/` — logique et UI de l'espace enfant : `main.js` (orchestrateur), `ui.js` (rendu), `questions.js` / `frenchQuestions.js` (génération des missions maths / français), `session.js`, `pairing.js` (appairage tablette), `sound.js`.
- `src/parent/` — espace parent : `main.js`, `auth.js` (connexion Google), `family.js` (accès Firestore), `dashboard.js` (rendu du tableau de bord).
- `src/shared/` — logique pure partagée : `progression.js` (XP/pièces/streaks/défis), `badges.js`, `avatarCustomization.js`, `difficulty.js`, `syncQueue.js`, `tokens.css` (design system), `firebaseConfig.js`.
- `tests/` — miroir de `src/`, 338 tests Vitest.
- `docs/cahier-des-charges.md` — spec fonctionnelle et design d'origine (référence).
- `docs/backlog-cahier-des-charges.md` — comparatif détaillé spec vs implémentation, 30/30 tâches du backlog marquées terminées.
- `firestore.rules`, `firebase.json`, `.firebaserc` — configuration de déploiement.
- `.env` — clés Firebase, jamais commité (`.gitignore`).

## 4. Modèle de données Firestore (état actuellement déployé en production)

- `families/{familyId}` — un document par compte parent connecté avec Google, champ `parentUid`. Sous-collection `rewards`, partagée entre les enfants d'une même famille.
- `children/{childId}` — un document top-level par enfant contenant le profil, `familyId`, XP, pièces, badges, personnalisation d'avatar, `pairingCode` et le `deviceUid` de la tablette autorisée. Sous-collections `sessions`, `rewardRequests` et `pairingRequests`.
- `pairingCodes/{code}` — document minimal contenant uniquement `childId` et `familyId`. Le code court comporte 6 caractères et ne donne jamais accès directement au profil enfant.
- Appairage tablette ↔ enfant : la tablette utilise Firebase Authentication anonyme, résout le code court, puis crée `children/{childId}/pairingRequests/{deviceUid}` avec le statut `pending`.
- Le parent doit explicitement **Autoriser** ou **Refuser** la demande depuis son espace. En cas d'autorisation, le `deviceUid` est enregistré sur le profil enfant.
- Une tablette révoquée ou refusée peut envoyer une nouvelle demande. La révocation ne supprime ni le profil enfant ni ses données.
- L'ancien système PIN (`shared/pin.js`, `hashPin`, `verifyPin`, `pinHash`) a été entièrement supprimé.

Les règles Firestore utilisent notamment `signedIn()`, `ownsFamily()`, `ownsChild()` et `isChildDevice()` afin d'isoler les données entre le parent propriétaire et la tablette autorisée.

## 5. Fonctionnalités livrées (déployées en production)

Le backlog fonctionnel complet (30 items priorisés P0/P1/P2, comparé au cahier des charges d'origine) est marqué **entièrement terminé** dans `docs/backlog-cahier-des-charges.md` :

- Multi-enfants (un code d'appairage par enfant), connexion Google parent (remplace l'ancienne authentification email/mot de passe), récompenses réelles échangeables contre des pièces, système de pièces 🪙.
- Avatar enrichi : 9 personnages (déblocables par niveau **ou** achetables en pièces), 4 chapeaux + 4 capes (déblocables par badge), 8 décors de fond nommés (déblocables par niveau).
- Défi quotidien, objectif hebdomadaire, rappel de série (streak) avec bannière colorée, album de badges avec date de déblocage.
- Mission Français : génération de questions d'accord singulier/pluriel (`frenchQuestions.js`), badge de maîtrise dédié.
- Dashboard parent : missions ciblées, graphique d'activité 7 jours (SVG fait maison), barres de progression par notion colorées, cartes d'insight "Point fort 💪 / À travailler 📚".
- Design system complet : palette crème/menthe/soleil/corail/sauge/rose, typographies Fredoka (titres) + Figtree (texte), grille d'espacement 8pt, ombres à deux niveaux (`src/shared/tokens.css`).
- Navigation par onglets persistante côté enfant (Missions / Défis / Avatar / Récompenses).
- Animations : cartes en cascade, médaille en zoom sur l'écran de résultats, bannière de passage de niveau, pièces animées.
- PWA : manifest et service worker fonctionnels, icônes et favicon générés.

## 6. Déploiement

- Projet Firebase : `missions-de-luna`.
- URL en production : **https://missions-de-luna.web.app**
- Espace parent : **https://missions-de-luna.web.app/parent.html**
- Commandes de déploiement (toujours depuis la machine Windows de l'utilisateur, jamais depuis un sandbox) :
  ```bash
  npm test
  npm run build
  firebase deploy --only firestore:rules,hosting
  ```
- Le service worker (`public/sw.js`) a une `CACHE_NAME` versionnée à incrémenter à chaque changement significatif des fichiers statiques, pour forcer les tablettes déjà installées à récupérer la nouvelle version.

### Incidents rencontrés et résolutions

1. `npm run build` lancé depuis le mauvais dossier (`C:\WINDOWS\system32`) → erreur `ENOENT`, résolu en se plaçant dans le bon dossier avant la commande.
2. Connexion Google impossible (fenêtre qui s'ouvre et se referme instantanément) → erreur console `auth/operation-not-allowed`. Cause : le fournisseur Google n'était pas activé dans Firebase Authentication → Sign-in method. Résolu en l'activant et en renseignant un email d'assistance.
3. Le code affichait un message d'erreur générique masquant la vraie cause → corrigé dans `src/parent/main.js` (`renderAuthForm`) pour afficher directement le code d'erreur Firebase réel à l'écran.
4. Favicon manquant (404 console) et icônes PWA à l'ancienne palette (lavande) → corrigés (icônes PNG générées, favicon ajouté, couleurs alignées sur le nouveau design system).

## 7. État Git actuel

- Dépôt : `https://github.com/gregoryschwarz/MISSION.git`, branche `master`.
- Le HEAD local est identique à `origin/master` : **tout ce qui est commité est déjà poussé sur GitHub**, rien en attente de push.
- Historique organisé par lots fonctionnels (le développement initial avait suivi une méthodologie de TDD par petits commits — features français/accord-pluriel, etc. — puis une grosse session de fonctionnalités a été regroupée a posteriori en 7 commits par couche architecturale, suivis de 2 correctifs PWA/favicon).

## 8. Appairage sans PIN — livré, commité et déployé

Le chantier de refonte de l'appairage est désormais terminé et en production.

État validé :

- suppression complète de l'ancien PIN et des tests associés ;
- code d'appairage court de 6 caractères via `pairingCodes/{code}` ;
- demande tablette dans `children/{childId}/pairingRequests/{deviceUid}` ;
- statut `pending`, puis décision parentale `approved` ou `rejected` ;
- sondage côté tablette via `pairingPollTimer` jusqu'à décision ;
- révocation d'une tablette depuis l'espace parent ;
- nouvelle demande possible après refus ou révocation ;
- règles Firestore durcies et compilées avec succès par Firebase ;
- `dailyMissionLimit`, `dailyMissionCount` et `dailyMissionCountDate` pris en charge ;
- récompense hebdomadaire personnalisable avec `weeklyRewardText` et `weeklyRewardDays` ;
- filtrage des récompenses actives/archivées côté enfant ;
- cache PWA incrémenté à `missions-de-luna-v17`.

Validation technique :

- `338/338` tests Vitest ;
- `npm run build` OK ;
- Firestore Emulator : règles chargées avec succès ;
- compilation Firebase des règles en production : OK ;
- déploiement Hosting + Firestore réussi ;
- commit principal de la refonte : `f700a6c`.

Validation réelle :

- appairage testé avec Ayden ;
- demande parentale reçue ;
- autorisation validée ;
- révocation validée ;
- refus validé ;
- nouvelle demande après refus validée.

Incident rencontré après déploiement : le passage de `signInWithPopup` à `signInWithRedirect` empêchait le maintien de la connexion à l'espace parent. Le fonctionnement stable utilise de nouveau `signInWithPopup`.

## 9. Petits points en suspens (mineurs)

- Le catalogue de récompenses est partagé entre tous les enfants d'une même famille (pas un catalogue par enfant) — choix par défaut, jamais remis en question explicitement.
- Extension du déblocage par pièces aux chapeaux/capes/décors (aujourd'hui limité aux personnages) — piste évoquée, non demandée formellement.
- Deux tokens `firebase login:ci` ont été générés et collés en clair pendant une session de dépannage de déploiement — à vérifier qu'ils ont bien été révoqués sur https://myaccount.google.com/permissions.

## 10. Pour reprendre le travail

Le chantier d'appairage sans PIN est terminé, déployé et validé en conditions réelles.

Pour une prochaine reprise :

1. partir de `master`, actuellement synchronisée avec `origin/master` après les correctifs validés ;
2. lancer `npm test` puis `npm run build` avant toute nouvelle livraison ;
3. conserver `signInWithPopup` pour la connexion Google parent ;
4. ne jamais lancer `firebase deploy` depuis un sandbox : toujours déployer depuis la machine Windows de l'utilisateur ;
5. incrémenter `CACHE_NAME` dans `public/sw.js` lors d'un changement statique significatif ;
6. poursuivre les évolutions fonctionnelles depuis cette base stable.

État de référence fonctionnel : appairage 6 caractères + approbation parentale + révocation/refus/nouvelle demande validés.
