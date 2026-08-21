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
3. Sur une tablette (ou un autre navigateur), ouvrir l'URL et saisir le code. Dans l'espace parent, autoriser la demande de cette tablette, puis jouer une mission complète et vérifier que XP/pièces/badges remontent bien côté parent.
4. Sur la tablette, utiliser "Ajouter à l'écran d'accueil" pour installer l'app en PWA.

> Le service worker (`public/sw.js`) garde en cache l'app shell ; sa `CACHE_NAME` est incrémentée à chaque changement significatif du design pour forcer les tablettes déjà installées à récupérer la nouvelle version au prochain lancement. Pensez à l'incrémenter (`v2` → `v3`, etc.) si vous modifiez sensiblement les fichiers statiques (`index.html`, `manifest.json`, icônes).

> Note : l'identifiant technique du projet Firebase est `missions-de-luna` (visible dans `.firebaserc`) alors que l'app s'appelle "Missions d'Ambre" — c'est un identifiant interne non visible par les familles, sans conséquence. Un identifiant de projet Firebase ne peut pas être renommé après coup (il faudrait recréer un projet entièrement neuf), donc ce n'est pas quelque chose à corriger.

## Installer sur la tablette

Ouvrir l'URL déployée dans Chrome ou Safari sur la tablette, puis utiliser "Ajouter à l'écran d'accueil" / "Installer l'application".

## Appairer la tablette

L'application prend en charge plusieurs enfants par famille. Chaque tablette possède une identité Firebase anonyme et ne peut accéder au profil d'un enfant qu'après autorisation explicite du parent.

1. Le parent se connecte sur `/parent.html` avec son compte Google. S'il n'a pas encore d'enfant, l'écran "Mes enfants" propose d'en ajouter un. Un parent peut ajouter autant d'enfants qu'il le souhaite depuis ce même écran.
2. Chaque ligne de la liste affiche un code d'appairage court de 6 caractères, avec des boutons **Copier** et **Partager**.
3. Sur la tablette de cet enfant, au premier lancement, entrer ce code d'appairage.
4. Revenir dans l'espace parent et cliquer sur **Autoriser** dans la section « Tablettes à autoriser ».
5. Sur la tablette, cliquer sur **Vérifier maintenant**. Elle est alors liée à cet enfant.

## Sécurité

Le code d'appairage permet uniquement de déposer une demande. Il ne donne pas accès au profil. Les règles Firestore autorisent la lecture et les écritures d'un enfant uniquement au compte Google parent propriétaire ou à l'identité Firebase anonyme de la tablette approuvée. Une demande inattendue doit être refusée. Révoquer une tablette se fait directement depuis l'espace parent. La révocation remet son `deviceUid` à `null` sans supprimer le profil enfant ni son historique. La tablette devra ensuite envoyer une nouvelle demande d'appairage, que le parent pourra autoriser ou refuser.
