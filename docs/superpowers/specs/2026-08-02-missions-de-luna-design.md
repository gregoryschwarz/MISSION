# Missions de Luna — Application de révision maths pour enfant

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

Application PWA pour une enfant de 8 ans (niveau CE2) pour réviser les maths en s'amusant sur tablette, avec un historique consultable à distance par les parents. Nouveau projet, dépôt séparé (`revision-maths-app`), sans lien avec les autres projets du dossier `jeux`.

## Périmètre (v1)

- Une seule matière au lancement : **mathématiques niveau CE2**.
- Un seul enfant, une seule tablette.
- Thème visuel : **Licornes & Magie**.
- Format de jeu : **mission du jour** (pas de mode libre en v1).
- Dashboard parent consultable à la demande (pas de notifications push).

**Hors périmètre volontaire (YAGNI)** : multi-enfants, notifications push, matières autres que les maths, export CSV/PDF, mode libre avec plusieurs mini-jeux. Ces besoins pourront être ajoutés plus tard s'ils se confirment.

## Architecture technique

- **Vite + JavaScript modulaire (ES modules)**, même outillage que le projet `flambe2` de l'utilisateur — pas de framework (React/Vue).
- Structure du code : `/src/child`, `/src/parent`, `/src/shared`.
- **Un seul projet Vite, deux points d'entrée** :
  - `/` — écran enfant, plein écran, optimisé tablette.
  - `/parent` — dashboard, responsive PC/téléphone.
- **Firebase** :
  - **Firestore** pour les données (sessions, profil, famille).
  - **Hosting** pour le déploiement (tier gratuit).
  - **Auth** pour le parent uniquement (email/mot de passe).
  - Pas de Cloud Functions en v1 : les agrégats (score du jour, progression) sont calculés côté client dans le dashboard parent en lisant Firestore directement, ce qui évite un backend à gérer et reste dans le tier gratuit.

## Modèle de données (Firestore)

```
families/{familyId}
  parentEmail: string
  childName: string
  pinHash: string          # PIN 4 chiffres hashé, créé par le parent
  createdAt: timestamp

families/{familyId}/profile (document unique)
  avatarLevel: number
  xp: number
  badges: string[]
  streakDays: number

families/{familyId}/sessions/{sessionId}
  date: string (YYYY-MM-DD)
  questionsTotal: number
  correctCount: number
  durationSeconds: number
  breakdown: {
    addition: { correct: number, total: number },
    soustraction: { correct: number, total: number },
    multiplication: { correct: number, total: number }
  }
  timestamp: server timestamp
```

**Authentification enfant :** pas de vrai compte Firebase — elle entre le PIN à 4 chiffres (créé par le parent) une seule fois sur la tablette, ce qui l'associe localement à `familyId` (stocké en `localStorage`, pas re-demandé à chaque ouverture).

**Authentification parent :** vrai compte Firebase Auth (email/mot de passe), lié au même `familyId`.

**Règles de sécurité Firestore :** chaque famille ne peut lire/écrire que ses propres documents (`familyId` vérifié via les règles, dérivé de l'UID Firebase Auth du parent ; l'écriture de session depuis l'app enfant utilise une auth anonyme Firebase liée au `familyId` stocké).

## Écrans et fonctionnalités

### Écran d'accueil (enfant)
- Avatar licorne centré, niveau et étoiles affichés.
- Gros bouton "✨ Mission du jour".
- Compteur de badges gagnés dans la semaine.

### Mission du jour
- 8 à 10 questions générées côté client, niveau CE2 :
  - Additions/soustractions avec retenue (nombres jusqu'à 1000).
  - Tables de multiplication ×2 à ×5 (extensible plus tard).
  - Comparaison de nombres jusqu'à 1000.
- Feedback immédiat animé (licorne, étoiles) à chaque réponse.
- Durée cible ~15-20 min. Au-delà, message doux invitant à une pause, **non bloquant**.
- **Hors-ligne** : questions générées localement, aucune requête réseau nécessaire pour jouer. Résultat stocké dans `localStorage` et synchronisé vers Firestore dès que la connexion revient (queue simple : tenter l'envoi, garder en local si échec, réessayer au prochain lancement/reconnexion).

### Écran résultat
- Récapitulatif étoiles/XP gagnés.
- Animation de déblocage si un palier d'avatar ou un badge est atteint.

### Dashboard parent (`/parent`)
- Connexion email/mot de passe (Firebase Auth).
- Liste des sessions (date, score, durée).
- Progression : niveau avatar, XP, série de jours consécutifs.
- Répartition des réussites par notion (ex : "82% en additions, 40% en tables de multiplication") pour repérer les points à retravailler.

## PWA & installation

- `manifest.json` + service worker pour :
  - Installation sur l'écran d'accueil de la tablette.
  - Fonctionnement hors-ligne du jeu (génération de questions locale, cache des assets statiques).
- La synchronisation des résultats vers Firestore nécessite le réseau, mais ne bloque pas le jeu.

## Gestion des erreurs

- Échec de synchronisation Firestore (hors-ligne, erreur réseau) : résultat conservé en `localStorage`, nouvelle tentative automatique à la prochaine ouverture ou reconnexion. Aucune erreur visible à l'enfant.
- PIN incorrect côté enfant : message simple "Code incorrect, redemande à un parent", pas de compteur de tentatives en v1 (pas de donnée sensible derrière ce PIN).
- Échec de connexion parent (mauvais mot de passe) : message d'erreur standard Firebase Auth.

## Tests

- **Vitest** sur :
  - La logique de génération des questions (bonnes bornes de niveau, pas de doublons évidents).
  - Le calcul de score et de progression XP/niveau.
- Pas de tests end-to-end (Playwright, etc.) dans ce premier périmètre — pourra être ajouté si l'app grossit.

## Déploiement

- Firebase Hosting, projet Firebase dédié créé par l'utilisateur (compte Google gratuit).
- Un seul environnement (pas de staging séparé) pour ce premier périmètre.
