# Système d'aide

**Date :** 2026-08-05
**Statut :** Approuvé pour planification

## Contexte et objectif

Demande directe de l'utilisateur ("peux-tu mettre un système d'aide en place ?") pour l'app "Missions de Luna" — un système d'aide utilisable par Luna pendant une mission, quand elle bloque sur une question. Ce n'est pas un sous-projet de la série précédente (badges de maîtrise, nouveaux types de questions, personnalisation de l'avatar, vue de progression parent, tous livrés et déployés) mais une nouvelle demande indépendante.

## Périmètre

- **Bouton "❓ Aide" toujours visible** pendant une question, dans les 3 formats de mission (quiz classique, QCM, chasse aux paires) — Luna peut le solliciter à tout moment, avant ou après avoir tenté une réponse.
- **Contenu fixe par notion** : un texte d'explication par notion (6 au total), identique quel que soit le niveau de difficulté. Aucune adaptation aux chiffres exacts de la question affichée.
- **Cas particulier — chasse aux paires** : ce format mélange plusieurs notions sur un même plateau (pas de "question active" unique), donc son bouton "❓" affiche les 6 explications d'un coup. Dans les 2 autres formats (quiz, QCM), il affiche directement l'explication de la notion de la question en cours.
- **Aucun impact sur le score, les badges, la progression ou le niveau de difficulté adaptatif** — consulter l'aide est purement informatif, n'affecte ni la réussite de la mission ni son statut "parfaite".

**Hors périmètre** : indices calculés à partir des chiffres exacts de la question, contenu différent par niveau de difficulté, suivi/statistiques d'utilisation de l'aide (ni pour l'enfant ni pour le parent), aide contextuelle pour le parent sur le tableau de bord, tutoriel de première utilisation.

## Contenu des 6 textes d'aide

```
addition       : "Additionner, c'est ajouter deux nombres ensemble. Commence par
                  les unités (les chiffres de droite). Si le total dépasse 9,
                  retiens 1 dizaine et ajoute-la à la colonne suivante."

soustraction   : "Soustraire, c'est enlever un nombre à un autre. Commence par
                  les unités. Si tu ne peux pas soustraire (le chiffre du haut
                  est plus petit), emprunte 1 dizaine au nombre suivant."

multiplication : "Multiplier, c'est additionner plusieurs fois le même nombre.
                  Par exemple, 4 × 3 veut dire 4 + 4 + 4. Tu peux aussi utiliser
                  tes tables de multiplication !"

comparaison    : "Pour comparer deux nombres, regarde d'abord combien de chiffres
                  ils ont : le nombre avec le plus de chiffres est le plus grand.
                  S'ils ont autant de chiffres, compare-les de gauche à droite,
                  chiffre par chiffre."

division       : "Diviser, c'est partager un nombre en parts égales. Par exemple,
                  12 ÷ 3 veut dire : combien de fois 3 rentre dans 12 ? Tu peux
                  t'aider de tes tables de multiplication à l'envers !"

fraction       : "Pour comparer deux fractions, regarde le numérateur (le chiffre
                  du haut) : si les dénominateurs (le chiffre du bas) sont
                  pareils, la fraction avec le plus grand numérateur est la
                  plus grande."
```

## Détails techniques

### `src/shared/helpContent.js` (nouveau, module pur)

```js
export const HELP_TEXT = {
  addition: 'Additionner, c\'est ajouter deux nombres ensemble. Commence par les unités (les chiffres de droite). Si le total dépasse 9, retiens 1 dizaine et ajoute-la à la colonne suivante.',
  soustraction: 'Soustraire, c\'est enlever un nombre à un autre. Commence par les unités. Si tu ne peux pas soustraire (le chiffre du haut est plus petit), emprunte 1 dizaine au nombre suivant.',
  multiplication: 'Multiplier, c\'est additionner plusieurs fois le même nombre. Par exemple, 4 × 3 veut dire 4 + 4 + 4. Tu peux aussi utiliser tes tables de multiplication !',
  comparaison: 'Pour comparer deux nombres, regarde d\'abord combien de chiffres ils ont : le nombre avec le plus de chiffres est le plus grand. S\'ils ont autant de chiffres, compare-les de gauche à droite, chiffre par chiffre.',
  division: 'Diviser, c\'est partager un nombre en parts égales. Par exemple, 12 ÷ 3 veut dire : combien de fois 3 rentre dans 12 ? Tu peux t\'aider de tes tables de multiplication à l\'envers !',
  fraction: 'Pour comparer deux fractions, regarde le numérateur (le chiffre du haut) : si les dénominateurs (le chiffre du bas) sont pareils, la fraction avec le plus grand numérateur est la plus grande.',
};

export function helpTextForType(type) {
  return HELP_TEXT[type] ?? 'Pas d\'aide disponible pour cette notion.';
}
```

### `src/shared/badges.js` — petit nettoyage : extraction de `emojiForType`

`src/parent/dashboard.js` a déjà une fonction privée `emojiForType(type)` qui cherche `mastery-${type}` dans `BADGES`. Cette même logique est nécessaire pour le système d'aide (afficher l'emoji de la notion sur l'écran d'aide). Plutôt que de dupliquer une troisième fois, extraction dans `src/shared/badges.js` (déjà le module partagé des badges) :

```js
export function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
```

`src/parent/dashboard.js` importe cette fonction au lieu de sa version privée (sa propre définition locale est supprimée). `src/child/ui.js` l'importe aussi pour le nouvel écran d'aide.

### `src/child/ui.js`

Nouvel helper privé (non exporté) :

```js
function helpOverlayHtml(type) {
  if (type === null) {
    return `
      <div class="help-overlay">
        <div class="help-card">
          <h2>❓ Aide</h2>
          ${Object.keys(HELP_TEXT)
            .map(
              (t) => `
            <div class="help-entry">
              <h3>${emojiForType(t)} ${t}</h3>
              <p>${helpTextForType(t)}</p>
            </div>`
            )
            .join('')}
          <button id="help-close" class="big-button">Fermer</button>
        </div>
      </div>`;
  }
  return `
    <div class="help-overlay">
      <div class="help-card">
        <h2>${emojiForType(type)} Aide</h2>
        <p>${helpTextForType(type)}</p>
        <button id="help-close" class="big-button">Fermer</button>
      </div>
    </div>`;
}
```

`renderQuestion` et `renderQuestionQcm` gagnent 3 nouveaux paramètres (`showHelp`, `onOpenHelp`, `onCloseHelp`) : un bouton `<button id="help-button" class="help-button" aria-label="Aide">❓</button>` toujours affiché, et si `showHelp` est vrai, `helpOverlayHtml(question.type)` ajouté par-dessus le contenu existant (superposition CSS plein écran, bloque les clics sur la question en dessous). `renderPairsRound` gagne les mêmes 3 paramètres, avec `helpOverlayHtml(null)` (liste des 6 notions) quand `showHelp` est vrai.

### `src/child/main.js`

Nouvel état `let helpVisible = false;`. Deux nouvelles fonctions :

```js
function openHelp() {
  helpVisible = true;
  rerenderCurrentScreen();
}

function closeHelp() {
  helpVisible = false;
  rerenderCurrentScreen();
}

function rerenderCurrentScreen() {
  if (missionMode === 'pairs') {
    showPairsRound();
  } else {
    showQuestion();
  }
}
```

`showQuestion()` et `showPairsRound()` passent `showHelp: helpVisible, onOpenHelp: openHelp, onCloseHelp: closeHelp` à leurs appels de rendu respectifs. `startMission()` réinitialise `helpVisible = false` (aide fermée à chaque nouvelle mission, cohérent avec la réinitialisation existante de `lastFeedback`).

### CSS (`src/child/style.css`)

Nouvelles règles : `.help-button` (petit bouton flottant, même traitement visuel que `.sound-toggle` déjà existant), `.help-overlay` (superposition plein écran, fond semi-transparent, bloque les interactions avec le contenu en dessous), `.help-card` (carte blanche centrée contenant le texte), `.help-entry` (bloc titre + texte pour chaque notion, utilisé uniquement dans la vue "toutes les notions" de la chasse aux paires).

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : aucun nouvel appel Firestore, aucune donnée à charger. `helpTextForType` a un texte de repli si un type inconnu est passé (ne devrait jamais arriver en pratique, les 6 types sont fixes).

## Tests

Tests Vitest sur `helpTextForType` :
- Retourne le bon texte pour chacune des 6 notions.
- Retourne le texte de repli pour un type inconnu.

Tests Vitest sur `emojiForType` (déplacé/exporté depuis `dashboard.js`) :
- Retourne le bon emoji pour chacune des 6 notions.
- Retourne `❓` pour un type inconnu.

Pas de test pour le rendu HTML (`renderQuestion`/`renderQuestionQcm`/`renderPairsRound`/`helpOverlayHtml`) ni pour le câblage `main.js`, cohérent avec le reste du projet (vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
