# Missions d'Ambre

Application PWA de révision maths (niveau CE2) pour tablette, avec suivi parent à distance.

## Configuration initiale (une seule fois)

1. Créer un projet sur https://console.firebase.google.com
2. Dans le projet : **Authentication** → activer les fournisseurs **Google** (pour le parent) et **Anonymous** (pour la tablette de l'enfant, qui s'y connecte sans compte). Pour Google, renseigner un email d'assistance dans la configuration du fournisseur.
3. Dans le projet : **Firestore Database** → créer une base en mode production.
4. Dans **Paramètres du projet** → **Général** → section "Vos applications" → créer une application Web, copier les valeurs de config.
5. Copier `.env.example` vers `.env` et coller les valeurs récupérées à l'étape 4.
6. Installer les dépendances : `npm install`
7. Installer la CLI Firebase si besoin : `npm install -g firebase-tools`, puis `firebase login`
8. Lier le projet : `firebase use --add` (choisir le projet créé à l'étape 1) — ceci crée `.firebaserc`.

## Développement

```bash
npm run dev
```

Ouvre l'écran enfant sur `http://localhost:5173/` et le dashboard parent sur `http://localhost:5173/parent.html`.

## Tests

```bash
npm test
```

## Déploiement

Ce projet est déjà lié à un projet Firebase (`.firebaserc`, `.env` présents localement). Pour ce dépôt, la configuration initiale ci-dessus n'est donc à refaire que si vous recréez le projet Firebase depuis zéro.

### Checklist avant de déployer

- [ ] Sur la [console Firebase](https://console.firebase.google.com) du projet : **Authentication → Sign-in method** → les fournisseurs **Google** et **Anonyme** sont bien activés
- [ ] **Firestore Database** existe et est en mode production (pas en mode test avec expiration)
- [ ] `.env` local contient les vraies valeurs du projet (jamais commité — vérifié dans `.gitignore`)
- [ ] CLI Firebase connectée sur cette machine : `firebase login`, puis `firebase use` affiche bien le bon projet
- [ ] `npm test` passe entièrement

### Déployer

```bash
npm install          # si pas déjà fait, ou après un git pull
npm test              # doit être 100 % vert avant de publier
npm run build          # génère dist/
firebase deploy --only firestore:rules,hosting
```

La commande affiche à la fin l'URL Hosting (ex. `https://missions-de-luna.web.app`).

### Vérification après déploiement

1. Ouvrir l'URL Hosting affichée : l'écran enfant doit se charger, ainsi que `/parent.html`.
2. Se connecter côté parent avec le compte Google, créer un enfant de test, noter son code d'appairage.
3. Sur une tablette (ou un autre navigateur), ouvrir l'URL, appairer avec ce code + PIN, jouer une mission complète et vérifier que XP/pièces/badges remontent bien côté parent.
4. Sur la tablette, utiliser "Ajouter à l'écran d'accueil" pour installer l'app en PWA.

> Le service worker (`public/sw.js`) garde en cache l'app shell ; sa `CACHE_NAME` est incrémentée à chaque changement significatif du design pour forcer les tablettes déjà installées à récupérer la nouvelle version au prochain lancement. Pensez à l'incrémenter (`v2` → `v3`, etc.) si vous modifiez sensiblement les fichiers statiques (`index.html`, `manifest.json`, icônes).

> Note : l'identifiant technique du projet Firebase est `missions-de-luna` (visible dans `.firebaserc`) alors que l'app s'appelle "Missions d'Ambre" — c'est un identifiant interne non visible par les familles, sans conséquence. Un identifiant de projet Firebase ne peut pas être renommé après coup (il faudrait recréer un projet entièrement neuf), donc ce n'est pas quelque chose à corriger.

## Installer sur la tablette

Ouvrir l'URL déployée dans Chrome ou Safari sur la tablette, puis utiliser "Ajouter à l'écran d'accueil" / "Installer l'application".

## Appairer la tablette

L'application prend en charge plusieurs enfants par famille : chaque enfant a son propre code d'appairage et son propre PIN, donc sa propre tablette (ou son propre créneau sur une tablette partagée).

1. Le parent se connecte sur `/parent.html` avec son compte Google. S'il n'a pas encore d'enfant, l'écran "Mes enfants" propose d'en ajouter un (prénom + code secret à 4 chiffres). Un parent peut ajouter autant d'enfants qu'il le souhaite depuis ce même écran.
2. Chaque ligne de la liste affiche le "code d'appairage" de l'enfant, avec des boutons **Copier** et **Partager**.
3. Sur la tablette de cet enfant, au premier lancement, entrer ce code d'appairage et son code secret.

## Sécurité

Le "code d'appairage" (l'identifiant du document `children/{childId}`) doit être traité comme un secret partagé, au même titre qu'un mot de passe : toute personne qui le connaît et qui est authentifiée (même anonymement) peut écrire des données de session et de profil pour cet enfant. C'est un choix de conception volontaire qui évite de dépendre de Cloud Functions pour valider les écritures côté serveur. Le code secret à 4 chiffres (PIN) constitue un second facteur au-dessus de ce mécanisme, mais ne remplace pas la confidentialité du code d'appairage lui-même. Chaque enfant ayant son propre code, le partager avec la mauvaise personne n'expose que les données de cet enfant-là, pas de toute la fratrie. Ne partagez donc ce code qu'avec les personnes autorisées à administrer le profil de l'enfant concerné.
