# Missions d'Ambre — résumé complet du projet

> Note de synthèse pour le vault. Dernière mise à jour : 11/08/2026.

## Qu'est-ce que c'est

Une PWA (Progressive Web App) de révision maths niveau CE2, en français, avec deux espaces :
- **espace enfant** (`index.html`) : missions ludiques sur tablette, gamifiées (XP, niveaux, pièces, badges, avatar personnalisable)
- **espace parent** (`parent.html`) : tableau de bord de suivi à distance, gestion des récompenses, missions ciblées

Usage : familial (tablette(s) à la maison), pas de diffusion App Store / Play Store prévue.

## Stack technique

- **Frontend** : Vite + JavaScript vanilla (pas de framework), deux pages (`index.html` enfant / `parent.html` parent)
- **Backend** : Firebase (Firestore + Authentication), pas de serveur applicatif dédié
- **Hébergement** : Firebase Hosting
- **Tests** : Vitest, 331 tests

**Décision actée le 11/08** : on reste sur cette stack (PWA + Firebase), pas de migration vers l'app mobile native (React Native/Expo + FastAPI + MongoDB) qui figurait dans le cahier des charges d'origine. Raison : usage familial uniquement, pas besoin de notifications push natives ni de présence sur les stores. Décision réversible si l'objectif change plus tard.

**Génération des questions** : 100 % locale et déterministe (`src/child/questions.js` et modules associés), sans IA/LLM. Choix assumé (fiabilité mathématique garantie, pas de dépendance réseau, fonctionne hors-ligne), pas un écart au cahier des charges d'origine qui prévoyait une génération par IA.

## Où sont les choses

Dossier projet : `C:\Users\Gsch6\OneDrive\Bureau\revision-maths-app`

- `src/child/` — logique et UI de l'espace enfant (`main.js` orchestrateur, `ui.js` rendu, `questions.js` génération, `session.js`, `pairing.js`, `avatar.js`, etc.)
- `src/parent/` — espace parent (`main.js`, `auth.js` connexion Google, `family.js` accès Firestore, `dashboard.js` rendu du tableau de bord)
- `src/shared/` — logique partagée pure (`progression.js` XP/pièces/streaks/défis, `badges.js`, `avatarCustomization.js`, `difficulty.js`, `tokens.css` design system)
- `tests/` — miroir de `src/`, 331 tests Vitest
- `docs/cahier-des-charges.md` — spec fonctionnelle + design d'origine (référence)
- `docs/backlog-cahier-des-charges.md` — comparatif détaillé spec vs implémentation, **30/30 tâches terminées**
- `firestore.rules`, `firebase.json`, `.firebaserc` — config déploiement
- `.env` — clés Firebase (jamais commité, dans `.gitignore`)

## Modèle de données Firestore

- `families/{familyId}` — un document par compte parent (Google), champ `parentUid`. Sous-collection `rewards` (catalogue de récompenses, partagé entre les enfants d'une même famille).
- `children/{childId}` — un document **top-level** par enfant contenant le profil, `familyId`, un code court et le `deviceUid` autorisé. `pairingCodes/{code}` ne contient que la correspondance entre le code court de 6 caractères et l'identifiant technique. Sous-collections `sessions`, `rewardRequests` et `pairingRequests`.

**Sécurité** : une tablette connectée anonymement dépose une demande sous `pairingRequests`. Le parent doit l'approuver avant que son UID soit inscrit dans `deviceUid`. Les règles Firestore isolent ensuite le profil entre le parent propriétaire et cette tablette. Cette validation parent remplace l'ancien PIN vérifié dans le navigateur et ne nécessite pas de Cloud Function payante.

## Fonctionnalités — état

Le backlog complet (30 items priorisés P0/P1/P2, comparé au cahier des charges d'origine) est **entièrement terminé** :

- Multi-enfants (un code + approbation parent par tablette), connexion Google parent par redirection compatible tablette, récompenses réelles échangeables contre des pièces, système de pièces 🪙
- Avatar enrichi : 9 personnages (déblocables par niveau **ou** par achat en pièces), 4 chapeaux + 4 capes (déblocables par badge), 8 décors de fond nommés (déblocables par niveau)
- Défi quotidien, objectif hebdomadaire, rappel de série intelligent (bannière colorée), album de badges avec date de déblocage
- Dashboard parent : missions ciblées, graphique d'activité 7 jours (SVG fait maison), barres de progression par notion colorées, cartes d'insight "Point fort 💪 / À travailler 📚"
- Design system complet (palette crème/menthe/soleil/corail/sauge/rose, typographie Fredoka + Figtree, grille d'espacement 8pt, ombres à deux niveaux)
- Navigation par onglets persistante côté enfant (Missions/Défis/Avatar/Récompenses)
- Animations : cartes en cascade, médaille en zoom sur l'écran de résultats, bannière de passage de niveau, pièces animées

Détail complet avec notes techniques par item : `docs/backlog-cahier-des-charges.md`.

## Déploiement

Projet Firebase : **`missions-de-luna`** (identifiant technique interne, différent du nom affiché "Missions d'Ambre" — sans conséquence, un id de projet Firebase n'est pas renommable après coup).

URL en production : **https://missions-de-luna.web.app**
Espace parent : **https://missions-de-luna.web.app/parent.html**

Checklist avant déploiement et commandes exactes : voir la section "Déploiement" du `README.md`. En résumé :
```bash
npm test
npm run build
firebase deploy --only firestore:rules,hosting
```

⚠️ Le déploiement doit se faire **depuis la machine de l'utilisateur** (Windows), pas depuis un environnement sandbox Claude — l'accès réseau aux API Google/Firebase y est bloqué (vérifié le 11/08 : `curl` vers `www.googleapis.com` échoue, `firebase deploy` échoue même avec un token valide).

Le service worker (`public/sw.js`) a une `CACHE_NAME` versionnée (`v2` au 11/08) à incrémenter à chaque changement significatif des fichiers statiques, pour forcer les tablettes déjà installées à récupérer la nouvelle version.

## Incidents rencontrés au déploiement (11/08) et résolutions

1. **`npm run build` échoue en PowerShell avec `ENOENT ... System32\package.json`** → il fallait d'abord `cd` dans le dossier du projet.
2. **Connexion Google : "Connexion impossible"**, fenêtre Google qui s'ouvre et se referme instantanément → erreur console `auth/operation-not-allowed`. Cause : le fournisseur Google n'était pas activé dans Firebase Authentication → Sign-in method. **Résolu** en l'activant + en renseignant un email d'assistance.
3. Le code affichait un message d'erreur générique qui masquait la vraie cause → corrigé dans `src/parent/main.js` (`renderAuthForm`) pour afficher le code d'erreur Firebase réel (`err.code`) directement à l'écran, plus facile à diagnostiquer sans devtools.

## Petits points en suspens (mineurs, non bloquants)

- `favicon.ico` renvoie une 404 dans la console (cosmétique, pas d'impact fonctionnel) — pas corrigé, à faire si ça dérange.
- Le catalogue de récompenses est partagé entre tous les enfants d'une même famille (pas un catalogue par enfant) — choix par défaut, jamais remis en question explicitement par l'utilisateur.
- Deux tokens `firebase login:ci` ont été générés et collés en clair dans la conversation pendant le dépannage du déploiement — **à révoquer** sur https://myaccount.google.com/permissions si ce n'est pas déjà fait.

## Pour reprendre le travail

- Backlog fonctionnel et design system : terminés, rien d'ouvert dans `docs/backlog-cahier-des-charges.md`.
- Prochaines pistes possibles (non demandées à ce jour) : catalogue de récompenses par enfant plutôt que par famille, extension du déblocage par pièces aux chapeaux/capes/décors (aujourd'hui limité aux personnages), favicon.
