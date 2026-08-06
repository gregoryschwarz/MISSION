# Notion mesures (monnaie, longueurs, temps)

**Date :** 2026-08-06
**Statut :** Approuvé pour planification

## Contexte et objectif

Deuxième sous-projet d'une série de 3 (géométrie → mesures → problèmes) visant à élargir l'app au-delà des notions de calcul actuelles. Géométrie (7ᵉ notion) est déjà fusionnée et déployée. Ce sous-projet ajoute trois nouvelles notions d'un coup, regroupées sous "Mesures" : monnaie, longueurs, temps — portant le total à 10 notions.

## Périmètre

### Monnaie
- **Exercice** : un ensemble de pièces/billets est affiché, l'enfant calcule le montant total (réponse numérique, en centimes).
- **Catalogue** : 1c, 2c, 5c, 10c, 20c, 50c, 1€, 2€, 5€, 10€ — icône SVG distincte par valeur.
- **Progression par niveau** : 2 pièces/billets (niveau 1) → 3 (niveau 2) → 4, avec dénominations plus variées (niveau 3).

### Longueurs
- **Exercice** : deux longueurs affichées sous forme de barres proportionnelles avec leur mesure en cm, l'enfant compare (`>` ou `<`).
- Réponse symbolique, même mécanisme que la comparaison de nombres existante.
- **Progression par niveau** : écart entre les deux longueurs plus petit (donc comparaison plus fine) à mesure que le niveau augmente.

### Temps
- **Exercice** : un cadran d'horloge (aiguilles) est affiché, l'enfant choisit l'heure correspondante parmi 3 propositions au format 24h français (ex. "14h30").
- Heures pile ou demi-heures uniquement (pas de minutes précises).
- **Progression matin/après-midi** (résout l'ambiguïté physique d'un cadran à 12 heures, qui ne peut pas montrer si c'est le matin ou l'après-midi) :
  - Niveau 1 : heures du matin, 1h–11h (lecture directe, le cadran correspond exactement au texte).
  - Niveau 2 : ajoute 12h00 / 12h30 (midi).
  - Niveau 3 : ajoute les heures d'après-midi, 13h–23h (même cadran que le matin, +12 sur le texte — la notion enseignée en CE2/CM1 du passage au format 24h).

**Hors périmètre** : rendre la monnaie (choisir les pièces pour atteindre un montant donné), lecture d'une règle graduée, minutes précises sur l'horloge, conversions d'unités (cm/m, etc.), problèmes (sous-projet suivant).

## Détails techniques

### Amélioration ciblée : généralisation des types "à choix fixes"

Aujourd'hui, `src/child/ui.js` (`isComparison`) et `src/child/choices.js` détectent les types à réponse fixe (`'comparaison'`, `'fraction'`) par une liste de noms codée en dur. "Longueur" et "temps" ont eux aussi une réponse à choix fixes, ce qui obligerait à allonger cette liste à chaque nouvelle notion du genre. À la place, ces deux fichiers seront généralisés pour se baser sur la présence de `question.options` (un tableau) plutôt que sur le nom du type :

**`src/child/choices.js`** :
```js
export function generateChoices(question) {
  if (Array.isArray(question.options)) {
    return question.options;
  }
  const correct = question.answer;
  // ... logique de distracteurs numériques inchangée ...
}
```

**`src/child/ui.js`** : la variable locale `isComparison` (dans `renderQuestion`) devient `hasOptions = Array.isArray(question.options)`, avec la même logique de rendu (boutons pour les options vs. saisie numérique). Le label spécial `>`/`<` reste conservé ; pour les autres valeurs d'options (ex. les heures), le bouton affiche directement la valeur (déjà le comportement de repli existant en QCM).

`comparaison` et `fraction` continuent de fonctionner à l'identique (ils posent déjà `options: ['>', '<']`), aucune régression attendue.

### `src/child/money.js` (nouveau, module pur)

```js
export const COINS = {
  '1c': { value: 1, label: '1c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#c68642"/><text x="50" y="59" font-size="24" text-anchor="middle" fill="#fff">1c</text></svg>' },
  '2c': { value: 2, label: '2c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#c68642"/><text x="50" y="59" font-size="24" text-anchor="middle" fill="#fff">2c</text></svg>' },
  '5c': { value: 5, label: '5c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#c68642"/><text x="50" y="59" font-size="24" text-anchor="middle" fill="#fff">5c</text></svg>' },
  '10c': { value: 10, label: '10c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#d4af37"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#fff">10c</text></svg>' },
  '20c': { value: 20, label: '20c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#d4af37"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#fff">20c</text></svg>' },
  '50c': { value: 50, label: '50c', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#d4af37"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#fff">50c</text></svg>' },
  '1e': { value: 100, label: '1€', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#e8c15c"/><circle cx="50" cy="50" r="20" fill="#c0c0c0"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#333">1€</text></svg>' },
  '2e': { value: 200, label: '2€', svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#c0c0c0"/><circle cx="50" cy="50" r="20" fill="#e8c15c"/><text x="50" y="58" font-size="20" text-anchor="middle" fill="#333">2€</text></svg>' },
  '5e': { value: 500, label: '5€', svg: '<svg viewBox="0 0 100 60"><rect width="100" height="60" rx="6" fill="#8b5fa3"/><text x="50" y="37" font-size="24" text-anchor="middle" fill="#fff">5€</text></svg>' },
  '10e': { value: 1000, label: '10€', svg: '<svg viewBox="0 0 100 60"><rect width="100" height="60" rx="6" fill="#c0392b"/><text x="50" y="37" font-size="24" text-anchor="middle" fill="#fff">10€</text></svg>' },
};

export function coinSvg(coinId) {
  return COINS[coinId]?.svg ?? '';
}
```

Valeurs en centimes pour éviter les erreurs d'arithmétique flottante. L'affichage du montant total à l'enfant (dans les distracteurs/choix, s'il y en avait) resterait en centimes bruts (cohérent avec les autres types numériques comme addition/soustraction) — pas de formatage "3,50 €" nécessaire côté logique, seulement dans l'affichage visuel des pièces elles-mêmes.

### `src/child/length.js` (nouveau, module pur)

```js
export function lengthBarSvg(cm, maxCm = 20) {
  const widthPercent = Math.min(100, (cm / maxCm) * 100);
  return `<svg viewBox="0 0 100 20"><rect width="${widthPercent}" height="20" fill="#a8e6cf"/></svg>`;
}
```

Pas de catalogue fixe ici (contrairement à `shapes.js`/`money.js`) : les longueurs sont des nombres tirés aléatoirement, pas des valeurs discrètes cataloguées.

### `src/child/clock.js` (nouveau, module pur)

```js
export function clockFaceSvg(hour12, minute) {
  // hour12 est toujours 1-12 (position physique des aiguilles)
  // minute est 0 ou 30
  // ... calcul trigonométrique de l'angle des aiguilles ...
  return `<svg viewBox="0 0 100 100">...</svg>`;
}

export function formatTime(hour24, minute) {
  return `${hour24}h${minute === 0 ? '00' : '30'}`;
}
```

### `src/child/questions.js` — trois nouveaux générateurs

```js
const MONEY_ITEM_COUNT_BY_LEVEL = { 1: 2, 2: 3, 3: 4 };
const MONEY_COIN_IDS = Object.keys(COINS);

export function generateMoney(level = 1) {
  const count = MONEY_ITEM_COUNT_BY_LEVEL[level] ?? MONEY_ITEM_COUNT_BY_LEVEL[1];
  const items = Array.from({ length: count }, () => MONEY_COIN_IDS[randomInt(0, MONEY_COIN_IDS.length - 1)]);
  const answer = items.reduce((sum, id) => sum + COINS[id].value, 0);
  return { type: 'monnaie', items, answer, prompt: 'Combien y a-t-il en tout ?' };
}

const LENGTH_MIN_GAP_BY_LEVEL = { 1: 5, 2: 3, 3: 1 };

export function generateLength(level = 1) {
  const minGap = LENGTH_MIN_GAP_BY_LEVEL[level] ?? LENGTH_MIN_GAP_BY_LEVEL[1];
  const a = randomInt(2, 20);
  let b;
  do {
    b = randomInt(2, 20);
  } while (Math.abs(a - b) < minGap);
  const answer = a > b ? '>' : '<';
  return {
    type: 'longueur',
    a, b, answer,
    prompt: `${a} cm ___ ${b} cm`,
    options: ['>', '<'],
  };
}

const TIME_HOURS_BY_LEVEL = {
  1: Array.from({ length: 11 }, (_, i) => i + 1),        // 1-11 (matin)
  2: [...Array.from({ length: 11 }, (_, i) => i + 1), 12], // + midi
  3: Array.from({ length: 23 }, (_, i) => i + 1),         // 1-23 (matin + après-midi)
};

export function generateTime(level = 1) {
  const hours = TIME_HOURS_BY_LEVEL[level] ?? TIME_HOURS_BY_LEVEL[1];
  const hour24 = hours[randomInt(0, hours.length - 1)];
  const minute = Math.random() < 0.5 ? 0 : 30;
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
  const answer = formatTime(hour24, minute);
  const distractors = new Set();
  while (distractors.size < 2) {
    const offsetSteps = randomInt(1, 3) * (Math.random() < 0.5 ? -1 : 1);
    let candidateMinutesTotal = (hour24 * 60 + minute + offsetSteps * 30 + 24 * 60) % (24 * 60);
    const candidate = formatTime(Math.floor(candidateMinutesTotal / 60), candidateMinutesTotal % 60);
    if (candidate !== answer) distractors.add(candidate);
  }
  return {
    type: 'temps',
    hour12, minute, hour24,
    answer,
    prompt: 'Quelle heure est-il ?',
    options: shuffle([answer, ...distractors]),
  };
}
```

`GENERATORS` gagne `monnaie: generateMoney`, `longueur: generateLength`, `temps: generateTime`. Les trois s'ajoutent à la fin du tableau `types` de `generateMission` (round-robin + `focusType`), dans cet ordre : `monnaie`, `longueur`, `temps` — après `geometrie`.

### `src/child/pairsGame.js`

`SYMBOLIC_ANSWER_TYPES` gagne `'longueur'` et `'temps'` (réponses non directement comparables par égalité de valeur pertinente — en pratique `temps` a des réponses textuelles uniques donc l'égalité de valeur fonctionnerait aussi, mais on utilise `pairKey` par cohérence et sécurité, comme `comparaison`/`fraction`). `monnaie` reste hors de cette liste (réponse numérique, appariement par valeur comme les autres types numériques).

`createPairsRound`'s calc-tile mapper gagne le transport des champs visuels nécessaires : `items: q.items` (monnaie), `hour12: q.hour12, minute: q.minute` (temps). `a`/`b` pour longueur sont déjà transportés implicitement si on ajoute `a: q.a, b: q.b` — à ajouter explicitement au mapper.

### `src/child/ui.js` — affichage

- `renderQuestion`/`renderQuestionQcm` : après le `<h2>${question.prompt}</h2>`, ajout de blocs conditionnels :
  - `question.items` (monnaie) → affiche chaque `coinSvg(id)` côte à côte dans un conteneur `.money-display`.
  - `question.type === 'longueur'` → affiche deux `lengthBarSvg(...)` avec labels, dans `.length-display`.
  - `question.hour12 !== undefined` (temps) → affiche `clockFaceSvg(question.hour12, question.minute)` dans `.clock-display`.
- `renderPairsRound`'s tuile de calcul : même logique conditionnelle que ci-dessus, à la place de `t.prompt` quand un champ visuel est présent.
- `FOCUS_LABELS` gagne `monnaie: 'la monnaie'`, `longueur: 'les longueurs'`, `temps: "l'heure"`.

### `src/shared/difficulty.js`, `progression.js`, `badges.js`, `helpContent.js`, `src/parent/dashboard.js`

Même patron que géométrie :
- `DEFAULT_DIFFICULTY_LEVELS` gagne `monnaie: 1, longueur: 1, temps: 1`.
- `OPERATION_TYPES` gagne `'monnaie', 'longueur', 'temps'`.
- `BADGES` gagne 3 badges de maîtrise (`mastery-monnaie`, `mastery-longueur`, `mastery-temps`), avec vérification explicite (au moment de l'implémentation, comme pour géométrie) qu'aucun gradient ne collisionne avec les 13 badges existants.
- `HELP_TEXT` gagne 3 entrées génériques en français, pas d'indice chiffré dynamique (hors périmètre, comme géométrie).
- `NOTION_TYPES` (sélecteur de révision ciblée) gagne les 3 nouveaux types.

### CSS (`src/child/style.css`)

Nouvelles règles `.money-display` (pièces alignées horizontalement), `.length-display` (barres empilées avec labels), `.clock-display` (cadran carré ~120px, cohérent avec `.shape-display`), + variantes réduites pour les tuiles de la chasse aux paires (`.pairs-tile .money-display`, etc.), sur le modèle de `.shape-display`/`.pairs-tile .shape-display`.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : génération purement synchrone côté client, comme les autres notions.

## Tests

Tests Vitest sur `src/child/money.js` : `coinSvg` retourne une chaîne non vide pour chaque pièce du catalogue, chaîne vide pour un id inconnu.

Tests Vitest sur `src/child/length.js` : `lengthBarSvg` retourne une largeur proportionnelle correcte pour différentes valeurs de cm (y compris le plafond à 100% quand `cm >= maxCm`).

Tests Vitest sur `src/child/clock.js` : `formatTime` produit le bon format pour heures/minutes pile et demi-heure (y compris les cas limites 0h/24h) ; `clockFaceSvg` retourne une chaîne non vide pour des heures/minutes valides.

Tests Vitest sur `generateMoney`, `generateLength`, `generateTime` (dans `tests/child/questions.test.js`) :
- `generateMoney` : le nombre de pièces correspond au niveau, `answer` égale toujours la somme réelle des valeurs des pièces tirées.
- `generateLength` : l'écart entre `a` et `b` respecte le minimum du niveau, `answer` correspond toujours à la comparaison réelle (`a > b` → `'>'`, etc.), `a !== b` toujours vrai.
- `generateTime` : `hour12` est toujours dans la plage 1-12, les heures tirées respectent la plage autorisée par le niveau, `options` contient toujours `answer` et exactement 3 valeurs uniques.

Tests Vitest sur `generateChoices` (dans `tests/child/choices.test.js`) : la nouvelle branche générique `Array.isArray(question.options)` retourne bien `question.options` tel quel, pour un type factice avec `options` arbitraires (pas seulement `comparaison`/`fraction`).

Tests Vitest sur `createPairsRound`/`attemptMatch` (dans `tests/child/pairsGame.test.js`) : les tuiles de calcul transportent bien `items`/`a`,`b`/`hour12`,`minute` selon le type ; `longueur` et `temps` sont appariés par `pairKey` (comme `comparaison`/`fraction`) ; `monnaie` est apparié par égalité de `answer` (comme les types numériques existants).

Pas de test pour le rendu HTML (`renderQuestion`/`renderQuestionQcm`/`renderPairsRound`), cohérent avec le reste du projet.

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
