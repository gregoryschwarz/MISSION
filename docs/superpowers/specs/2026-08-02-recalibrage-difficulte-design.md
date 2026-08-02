# Recalibrage de la difficulté des questions (début CE2)

**Date :** 2026-08-02
**Statut :** Approuvé pour planification

## Contexte et objectif

Retour utilisateur en conditions réelles : les questions actuelles (nombres jusqu'à 999, soustractions avec retenue, tables de multiplication jusqu'à ×5 avec facteur jusqu'à 10) sont trop difficiles pour une enfant qui débute tout juste le CE2. Ce sous-projet recalibre uniquement les bornes numériques des générateurs de questions existants, sans toucher au reste de l'application.

C'est le premier de deux sous-projets liés à ce retour : le second (difficulté progressive/adaptative + variété de mini-jeux) sera traité séparément, dans un futur cycle conception → plan → implémentation.

## Périmètre

Un seul fichier concerné : `src/child/questions.js` (module pur, déjà couvert par des tests Vitest).

- **Additions** : deux nombres à deux chiffres dont la somme reste strictement inférieure à 100 (ex : 34 + 52).
- **Soustractions** : nombres inférieurs à 100, **sans retenue** — chaque colonne (dizaines, unités) du deuxième nombre est toujours inférieure ou égale à la colonne correspondante du premier (ex : 68 − 23 est valide, 52 − 27 ne l'est pas).
- **Multiplications** : tables **×2, ×5, ×10 uniquement** (les trois premières enseignées en CE2), facteur de 1 à 10 inchangé.
- **Comparaisons** : deux nombres distincts, chacun inférieur à 100 (au lieu de 999).

**Hors périmètre** : tout ce qui touche à la difficulté progressive/adaptative selon les performances de l'enfant, ainsi que l'ajout de nouveaux types de mini-jeux — ces deux sujets forment le second sous-projet, à concevoir séparément.

## Détails techniques

- `generateAddition()` : `a = randomInt(10, 79)`, `b = randomInt(1, 99 - a)` — garantit deux nombres positifs dont la somme reste sous 100.
- `generateSubtraction()` : construit `a` et `b` chiffre par chiffre (dizaines/unités) en garantissant que chaque chiffre de `b` est inférieur ou égal au chiffre correspondant de `a`, ce qui élimine toute retenue par construction plutôt que par un ré-échantillonnage a posteriori.
- `generateMultiplication()` : la table (`a`) est tirée parmi `[2, 5, 10]` au lieu de `randomInt(2, 5)` ; le facteur (`b`) reste `randomInt(1, 10)`.
- `generateComparison()` : bornes changées de `randomInt(1, 999)` à `randomInt(1, 99)`.
- `generateMission()` : logique de répartition/mélange entre les 4 types **inchangée**.

## Tests

Les tests existants dans `tests/child/questions.test.js` sont mis à jour pour vérifier les nouvelles bornes (somme < 100, absence de retenue en soustraction — vérifiable en comparant les chiffres un par un plutôt que juste le résultat final, table parmi `[2, 5, 10]`, comparaison < 100). Le test de `generateMission` (nombre de questions, types autorisés) reste inchangé.

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
