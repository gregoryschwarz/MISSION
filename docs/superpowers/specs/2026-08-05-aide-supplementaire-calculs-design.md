# Aide supplémentaire pour les calculs (CE2)

**Date :** 2026-08-05
**Statut :** Approuvé pour planification

## Contexte et objectif

Suite directe du système d'aide livré précédemment (bouton "❓" pendant une question, texte fixe et générique par notion). L'utilisateur souhaite enrichir cette aide pour les 4 opérations de calcul (addition, soustraction, multiplication, division) avec un indice calculé à partir des vrais chiffres de la question affichée — précédemment explicitement hors périmètre, maintenant demandé.

## Périmètre

- **Indice chiffré dynamique** pour addition, soustraction, multiplication, division uniquement — comparaison et fraction gardent le texte générique existant sans changement (ce ne sont pas des « calculs » à décomposer au sens de cette demande).
- **S'ajoute en dessous** du texte générique existant dans l'écran d'aide (les deux se complètent), affiché sous forme d'étapes numérotées.
- **Uniquement dans les écrans à question unique** (quiz classique, QCM) — la vue "toutes les notions" de la chasse aux paires (qui n'a pas de question active unique) reste inchangée, sans indice chiffré.
- **Décomposition colonne par colonne** pour addition/soustraction (unités, dizaines, centaines, avec retenue/emprunt explicite), **addition répétée ou référence à la table** pour multiplication, **liste des multiples** pour division.

**Hors périmètre** : indice chiffré pour comparaison/fraction, indice dans la vue "toutes les notions" de la chasse aux paires, personnalisation du niveau de détail par difficulté, tout impact sur le score/badges/progression.

## Algorithmes

### Addition (`additionHint(a, b)`)

Décompose colonne par colonne, de droite à gauche (unités, dizaines, centaines, ...), avec propagation de retenue :

```
27 + 15 :
1. Unités : 7 + 5 = 12 → tu poses 2 et retiens 1.
2. Dizaines : 2 + 1 + 1 (retenue) = 4.
3. Résultat : 27 + 15 = 42.
```

Gère aussi le cas où la retenue déborde au-delà du nombre de chiffres des deux opérandes (ex: 95 + 8 = 103).

### Soustraction (`subtractionHint(a, b)`)

Décompose colonne par colonne avec emprunt explicite quand nécessaire (le générateur garantit toujours `a >= b`) :

```
42 - 15 :
1. Unités : tu ne peux pas faire 2 - 5, tu empruntes 1 à la colonne suivante : 12 - 5 = 7.
2. Dizaines : 3 - 1 = 2.
3. Résultat : 42 - 15 = 27.
```

Cas sans emprunt (niveaux 1-2, où les chiffres de `b` sont garantis ≤ ceux de `a`) :

```
38 - 15 :
1. Unités : 8 - 5 = 3.
2. Dizaines : 3 - 1 = 2.
3. Résultat : 38 - 15 = 23.
```

Cas d'emprunt en cascade à travers un chiffre 0 (niveau 3, ex: `a` a un chiffre 0 aux dizaines) :

```
100 - 45 :
1. Unités : tu ne peux pas faire 0 - 5, tu empruntes 1 à la colonne suivante : 10 - 5 = 5.
2. Dizaines : la colonne précédente a emprunté, donc ici c'est 9. 9 - 4 = 5.
3. Centaines : 0 - 0 = 0.
4. Résultat : 100 - 45 = 55.
```

### Multiplication (`multiplicationHint(a, b)`)

Si le plus petit des deux facteurs est ≤ 5, addition répétée du plus grand facteur (limite la longueur de la chaîne) ; sinon, référence à la table de multiplication (évite des additions à 8-10 termes, illisibles) :

```
2 × 5 :
1. 2 × 5, c'est 5 répété 2 fois : 5 + 5 = 10.
2. Résultat : 2 × 5 = 10.

6 × 7 :
1. 6 × 7 : utilise ta table de multiplication de 6 (ou de 7).
2. Résultat : 6 × 7 = 42.
```

### Division (`divisionHint(a, b)`)

Liste les multiples du diviseur jusqu'au dividende :

```
12 ÷ 3 :
1. 12 ÷ 3 : combien de fois 3 dans 12 ? Compte les multiples de 3 : 3, 6, 9, 12.
2. Résultat : 12 ÷ 3 = 4.
```

## Détails techniques

### `src/child/hints.js` (nouveau, module pur)

```js
const PLACE_LABELS = ['unités', 'dizaines', 'centaines', 'milliers'];

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function labelFor(index) {
  return PLACE_LABELS[index] ?? `colonne ${index + 1}`;
}

export function additionHint(a, b) {
  const digitsA = String(a).split('').reverse().map(Number);
  const digitsB = String(b).split('').reverse().map(Number);
  const length = Math.max(digitsA.length, digitsB.length);
  const steps = [];
  let carry = 0;
  for (let i = 0; i < length; i += 1) {
    const da = digitsA[i] ?? 0;
    const db = digitsB[i] ?? 0;
    const sum = da + db + carry;
    const digit = sum % 10;
    const nextCarry = sum >= 10 ? 1 : 0;
    let text = `${capitalize(labelFor(i))} : ${da} + ${db}`;
    if (carry > 0) text += ` + ${carry} (retenue)`;
    text += ` = ${sum}`;
    text += nextCarry ? ` → tu poses ${digit} et retiens 1.` : '.';
    steps.push(text);
    carry = nextCarry;
  }
  if (carry > 0) {
    steps.push(`${capitalize(labelFor(length))} : tu poses la retenue ${carry}.`);
  }
  steps.push(`Résultat : ${a} + ${b} = ${a + b}.`);
  return steps;
}

export function subtractionHint(a, b) {
  const digitsA = String(a).split('').reverse().map(Number);
  const digitsB = String(b).split('').reverse().map(Number);
  const steps = [];
  let borrow = 0;
  for (let i = 0; i < digitsA.length; i += 1) {
    const raw = digitsA[i] - borrow;
    const cascaded = raw < 0;
    const da = cascaded ? raw + 10 : raw;
    const db = digitsB[i] ?? 0;
    const prefix = cascaded
      ? `${capitalize(labelFor(i))} : la colonne précédente a emprunté, donc ici c'est ${da}. `
      : `${capitalize(labelFor(i))} : `;
    if (da < db) {
      steps.push(
        `${prefix}Tu ne peux pas faire ${da} - ${db}, tu empruntes 1 à la colonne suivante : ${da + 10} - ${db} = ${da + 10 - db}.`
      );
      borrow = 1;
    } else {
      steps.push(`${prefix}${da} - ${db} = ${da - db}.`);
      borrow = cascaded ? 1 : 0;
    }
  }
  steps.push(`Résultat : ${a} - ${b} = ${a - b}.`);
  return steps;
}

export function multiplicationHint(a, b) {
  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);
  const steps = [];
  if (smaller <= 5) {
    const terms = Array(smaller).fill(larger).join(' + ');
    steps.push(`${a} × ${b}, c'est ${larger} répété ${smaller} fois : ${terms} = ${a * b}.`);
  } else if (smaller === larger) {
    steps.push(`${a} × ${b} : utilise ta table de multiplication de ${smaller}.`);
  } else {
    steps.push(`${a} × ${b} : utilise ta table de multiplication de ${smaller} (ou de ${larger}).`);
  }
  steps.push(`Résultat : ${a} × ${b} = ${a * b}.`);
  return steps;
}

export function divisionHint(a, b) {
  const quotient = a / b;
  const multiples = [];
  for (let i = 1; i <= quotient; i += 1) {
    multiples.push(i * b);
  }
  return [
    `${a} ÷ ${b} : combien de fois ${b} dans ${a} ? Compte les multiples de ${b} : ${multiples.join(', ')}.`,
    `Résultat : ${a} ÷ ${b} = ${quotient}.`,
  ];
}

export function dynamicHintSteps(question) {
  switch (question.type) {
    case 'addition':
      return additionHint(question.a, question.b);
    case 'soustraction':
      return subtractionHint(question.a, question.b);
    case 'multiplication':
      return multiplicationHint(question.a, question.b);
    case 'division':
      return divisionHint(question.a, question.b);
    default:
      return null;
  }
}
```

`additionHint`/`subtractionHint`/`multiplicationHint`/`divisionHint` take the raw `a`/`b` values already present on every question object generated by `src/child/questions.js` (`{ type, a, b, answer, prompt }`). `dynamicHintSteps(question)` is the single entry point the UI calls — it returns `null` for `comparaison`/`fraction` (or any unrecognized type), and the UI treats `null` as "no dynamic hint to show".

### `src/child/ui.js` — integrate into `helpOverlayHtml`

`helpOverlayHtml` gains a second parameter for the single-notion case: `helpOverlayHtml(type, question)`. When `type` is not `null`, it computes `dynamicHintSteps(question)` and, if non-null, renders the steps as an ordered list right after the existing generic `<p>${helpTextForType(type)}</p>`:

```js
${hintSteps ? `<ol class="help-steps">${hintSteps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
```

The `type === null` branch (used only by `renderPairsRound`, which has no single active question) is unaffected — no dynamic hint there, matching the existing "toutes les notions" behavior. `renderQuestion` and `renderQuestionQcm` pass the full `question` object (`helpOverlayHtml(question.type, question)`) instead of just the type string; `renderPairsRound` keeps calling `helpOverlayHtml(null)` unchanged.

### CSS (`src/child/style.css`)

New `.help-steps` rule for the ordered list (padding, spacing between `<li>` items) — visually distinct from the existing generic `<p>` text but consistent with the `.help-card`'s minimal aesthetic.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : ces fonctions sont purement synchrones sur des données déjà présentes dans l'objet question (aucun appel Firestore). `dynamicHintSteps` retourne `null` pour tout type non reconnu (comportement de repli sûr, ne devrait jamais arriver en pratique).

## Tests

Tests Vitest sur `src/child/hints.js` :
- `additionHint` : cas sans retenue, cas avec une retenue simple, cas avec retenue qui déborde sur une nouvelle colonne (ex: 95 + 8 = 103), nombres à 3 chiffres.
- `subtractionHint` : cas sans emprunt, cas avec un emprunt simple, cas avec emprunts en chaîne sur plusieurs colonnes.
- `multiplicationHint` : cas avec le plus petit facteur ≤ 5 (addition répétée), cas avec le plus petit facteur > 5 (référence à la table).
- `divisionHint` : plusieurs quotients différents (1, un quotient moyen, quotient maximum 10).
- `dynamicHintSteps` : route correctement vers chacune des 4 fonctions selon `question.type`, retourne `null` pour `comparaison` et `fraction`.

Pas de test pour le rendu HTML (`helpOverlayHtml` mis à jour), cohérent avec le reste du projet (vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore, aucun changement côté parent.
