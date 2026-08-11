# Cahier des charges — App de révision maths CE2

## 🎯 L'application

Une app de révision de maths (niveau CE2) pour enfants, en français, avec deux espaces distincts : un espace enfant ludique et un tableau de bord parent orienté suivi. Design coloré et tactile pour l'enfant, sobre et clair pour le parent.

## 👧 Côté Enfant

- Connexion simple : code d'appairage + code PIN à 4 chiffres (pavé tactile)
- Missions de maths sur 5 thèmes : additions, soustractions, multiplications, fractions, géométrie
- Questions générées par IA (avec repli automatique pour ne jamais bloquer une mission)
- Difficulté adaptative : monte/descend selon les résultats
- Feedback immédiat + confettis à la réussite
- Gamification complète : XP, niveaux, pièces 🪙, badges & médailles, séries (streaks), défi quotidien
- Avatar personnalisable : 9 personnages + accessoires (chapeaux 🎩 & capes ✨) + 8 décors colorés en fond
- Album des badges 🏅 : collection avec date de déblocage de chaque badge
- Rappel de série in-app pour revenir jouer et ne pas casser sa série
- Récompenses réelles échangeables contre des pièces

## 👨‍👧 Côté Parent

- Connexion Google
- Création du profil enfant + génération du code d'appairage (avec boutons Copier et Partager)
- Tableau de bord : résumé de la semaine, graphique des 7 derniers jours, points forts/faibles, progression par thème
- Assigner des missions ciblées + fixer des objectifs hebdomadaires
- Récompenses réelles : créer, puis valider ou refuser les demandes de l'enfant
- Support multi-enfants

## 🛠️ Technique

- Frontend : React Native / Expo (mobile), polices Fredoka + Figtree, animations Reanimated
- Backend : FastAPI (auth, missions, XP, badges, objectifs, rapports, récompenses)
- Base de données : MongoDB
- IA : génération des exercices via la clé LLM Emergent
- Auth : Google (parent) + code/PIN (enfant)

## ✅ Qualité

- Backend testé 32/32 (100 %), parcours enfant validé de bout en bout
- Migration automatique des anciens profils pour éviter tout bug

## 🎨 Philosophie visuelle : une app, deux ambiances

L'app a été pensée en double personnalité :

- **Côté enfant → tactile & ludique** : gros éléments, couleurs vives, dégradés, animations rebondissantes, gros boutons faciles à taper.
- **Côté parent → clair & data** : cartes blanches sur fond crème, graphiques sobres, hiérarchie nette, zéro distraction.

La même typographie relie les deux univers pour la cohérence.

### 🌈 Palette de couleurs

Une palette chaleureuse et « bonbon », volontairement sans bleu, violet ni orange (pour éviter le look « IA générique » et rester enfantin/doux) :

| Rôle | Couleur | Hex |
|---|---|---|
| Fond principal (crème) | 🟡 doux | `#FFF9F2` |
| Cartes | ⚪ blanc | `#FFFFFF` |
| Marque / succès (menthe) | 🟢 | `#06D6A0` |
| Primaire (soleil) | 🟡 | `#FFD166` |
| Secondaire / erreur (corail) | 🔴 | `#F25F5C` |
| Tertiaire (sauge) | 🟩 | `#8CB369` |
| Accent (rose) | 🌸 | `#EF476F` |
| Texte | quasi-noir | `#1D1E2C` |

Chaque thème de maths a sa couleur (repère visuel immédiat) :

- Additions → menthe
- Soustractions → corail
- Multiplications → jaune
- Fractions → sauge
- Géométrie → rose

### ✍️ Typographie

- **Fredoka** (arrondie, joviale) → titres et gros chiffres → côté « jeu »
- **Figtree** (nette, lisible) → textes, données, formulaires → côté « sérieux/parent »
- Échelle de tailles : 12 / 14 / 16 / 20 / 24 / 30 / 40

### 📐 Système d'espacement & formes

- Spacing : 4, 8, 12, 16, 24, 32, 48 (grille de 8pt)
- Arrondis : 6 (petit), 12 (moyen), 20 (grand), 999 (pilule)
- Ombres : deux niveaux (card légère, raised plus marquée) pour donner du relief tactile
- Boutons ≥ 56px de haut, cibles tactiles généreuses (adaptées aux enfants)

### 👧 Univers enfant en détail

- En-têtes en dégradé menthe avec coins bas arrondis (effet « bulle »)
- Avatar rond avec son décor en dégradé, accessoires superposés (chapeau au-dessus, cape/aura en bas)
- Barre d'XP colorée + mini-stats (série 🔥 / badges 🏅 / réussites ✅) dans des pastilles translucides
- Cartes de missions : grandes, colorées par thème, avec gros emoji, badge de niveau, effet d'apparition en cascade (FadeInDown) et léger enfoncement au toucher (scale 0.96)
- Écran de jeu : question en très gros, 4 boutons-réponses XXL ; feedback couleur immédiat (vert = bon, corail = faux) + icône ✓/✗ + retour haptique
- Écran de résultat : confettis animés (pièces qui tombent et tournent), médaille qui « zoome » (ZoomIn), gains XP/pièces, bannière de passage de niveau

### 👨‍👧 Univers parent en détail

- Fond crème + cartes blanches avec bordure fine et ombre douce → aspect « tableau de bord »
- Graphique en barres sur 7 jours (activité), barres de progression par thème (chacune à la couleur du thème)
- Cartes d'insight « Point fort 💪 » (menthe) et « À travailler 📚 » (corail)
- Formulaires clairs (label au-dessus du champ), chips de sélection de thème, segmented control pour les objectifs
- Boutons d'action colorés selon l'intention (valider = menthe, refuser = neutre, déconnexion = corail)

### 🏅 Éléments de gamification (visuels)

- Médaillons de badges : cercle en dégradé jaune avec l'emoji ; verrouillés = grisés avec 🔒
- Album des badges : chaque médaille gagnée sur fond dégradé + étiquette date « Débloqué le … »
- Décors : 8 pastilles en dégradé (Menthe, Crème, Soleil, Corail, Forêt, Bonbon, Arc-en-ciel, Nuit étoilée)
- Pièces 🪙 et série 🔥 mises en avant partout
- Bannière de série intelligente qui change de couleur selon l'état (en jeu = corail, à démarrer = jaune, réussie = menthe)

### ✨ Animations & interactions

- Reanimated (60 fps) : apparitions en cascade, zoom des médailles, chute des confettis
- Micro-interactions : tous les boutons/cartes se « compriment » légèrement au toucher
- Haptique (expo-haptics) : vibration au tap du pavé PIN, succès/erreur en jeu
- Icônes : jeu @expo/vector-icons (Ionicons) — jamais d'emoji utilisés comme icônes d'interface (les emoji servent uniquement de personnages/décors)

## 📱 Écrans de référence (maquettes)

Captures d'un prototype de référence (`docs/screenshots/reference-ecrans-1.png` et `-2.png`), confirmant et précisant le design system ci-dessus. Navigation enfant en bas d'écran à 4 onglets : **Missions** (fusée) · **Défis** (flamme) · **Avatar** (smiley) · **Récompenses** (cadeau).

### Écrans parent / commun

- **Accueil — choix du rôle** : dégradé menthe plein écran, mascotte (abaque) dans un cercle blanc, titre « Missions d'Ambre » + sous-titre « Les maths deviennent une aventure ✨ ». Deux cartes tactiles blanches empilées : « Espace Enfant — Joue à tes missions de maths » (icône manette) et « Espace Parent — Suivre & récompenser • Google » (icône silhouette).

### Écrans enfant

- **Connexion enfant** : icône fusée, titre « Prêt à jouer ? » / « Demande ton code à ton parent ». Champ « Code d'appairage » avec placeholder `Ex : AB12CD`. Pavé PIN tactile à 4 points de progression + clavier numérique 1-9/0/effacer. Bouton pilule « C'est parti ! ».
- **Accueil enfant** : en-tête dégradé menthe à coins bas arrondis avec avatar rond (ex. chien), prénom (« Salut Ambre ! »), niveau, compteur de pièces 🪙. Barre d'XP (`40/100 XP`). Trois pastilles mini-stats translucides : série 🔥 (jours), badges 🏅 (total), réussites ✅ (total). Bannière verte de confirmation « Bravo, mission du jour faite ! » avec rappel « Reviens demain ! ». Grille « Choisis ta mission » : une carte par thème, colorée selon la couleur du thème, avec icône, nom et niveau (`Additions Niv.3`, `Soustractions Niv.1`, `Multiplications Niv.2`, `Fractions Niv.1`, `Géométrie …`).
- **Mission en cours** : en-tête coloré à la couleur du thème avec bouton fermer, nom du thème + compteur de progression (`1/6`). Question énorme centrée sur carte blanche (« Quel est le résultat de 347 + 128 ? »). 4 boutons-réponses pilule empilés, taille généreuse.
- **Défis & Badges** : carte « Défi du jour » (fond soleil) avec objectif texte, barre de progression (`0/5`), bouton d'action. Deux cartes stats côte à côte : « Série actuelle » (corail, icône flamme) et « Meilleure série » (menthe, icône trophée). Section « Mes badges (8/10) » en grille 2 colonnes + lien « Ma collection ».
- **Album des badges** (« Ma collection ») : en-tête soleil avec retour, compteur (`8 badges sur 10`) + barre de progression. Liste « Badges gagnés 🎉 » : chaque ligne = médaillon + nom + condition de déblocage + étiquette grise « 🔓 Débloqué le [date] » (confirme le besoin de la tâche #8 du backlog).
- **Avatar** : aperçu de l'avatar équipé (nom + description), compteur de pièces avec incitation (« Gagne des pièces en jouant »). Section « Personnages » en grille : médaillon + nom (« Minou le chat », « Rex le chien », « Filou le renard », « Bao le panda »…) + statut (« Choisir » / « Équipé » en pastille verte / verrouillé avec 🔒 + coût en pièces, ex. `🔒 80`).
- **Récompenses (enfant)** : en-tête avec compteur de pièces disponibles + icône partage. Carte récompense : emoji + nom + coût en pièces + bouton pilule vert « Échanger ».

### Cohérence avec le design system textuel

Ces maquettes confirment : le dégradé menthe des en-têtes à coins arrondis, les pastilles translucides de stats, les boutons pilule, les couleurs par thème, le déblocage de personnages par paliers de pièces (pas seulement par niveau comme dans l'implémentation actuelle), et le format exact de l'étiquette de date des badges (« Débloqué le 7 août 2026 »). Elles précisent aussi un élément non détaillé dans le texte : la **navigation par onglets en bas d'écran** (Missions / Défis / Avatar / Récompenses) comme structure de l'espace enfant.

---

*Voir `docs/backlog-cahier-des-charges.md` pour le comparatif détaillé avec l'implémentation actuelle et la liste des tâches priorisées.*
