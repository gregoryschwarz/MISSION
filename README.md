# Missions de Luna

Application PWA de révision maths (niveau CE2) pour tablette, avec suivi parent à distance.

## Configuration initiale (une seule fois)

1. Créer un projet sur https://console.firebase.google.com
2. Dans le projet : **Authentication** → activer le fournisseur **Email/Password**.
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

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

## Installer sur la tablette

Ouvrir l'URL déployée dans Chrome ou Safari sur la tablette, puis utiliser "Ajouter à l'écran d'accueil" / "Installer l'application".

## Appairer la tablette

1. Le parent se connecte sur `/parent.html`, crée son compte, puis crée le profil de l'enfant (prénom + code secret à 4 chiffres).
2. Le dashboard affiche un "code d'appairage".
3. Sur la tablette, au premier lancement, entrer ce code d'appairage et le code secret.
