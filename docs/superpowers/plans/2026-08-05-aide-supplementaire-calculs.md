# Aide supplémentaire pour les calculs (CE2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the existing help overlay with a step-by-step worked example computed from the actual numbers of the current question, for the 4 arithmetic operations (addition, soustraction, multiplication, division) — shown below the existing generic text, not replacing it.

**Architecture:** A new pure module (`src/child/hints.js`) owns the 4 hint algorithms plus a `dynamicHintSteps(question)` dispatcher that returns `null` for `comparaison`/`fraction`. `src/child/ui.js`'s existing `helpOverlayHtml` helper gains a second parameter (the full `question` object) and renders the returned steps as a numbered list when non-null. `renderQuestion`/`renderQuestionQcm` pass the question through; `renderPairsRound`'s "all notions" view is untouched.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Dynamic hint algorithms (TDD)

**Files:**
- Create: `src/child/hints.js`
- Test: `tests/child/hints.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/child/hints.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  additionHint,
  subtractionHint,
  multiplicationHint,
  divisionHint,
  dynamicHintSteps,
} from '../../src/child/hints.js';

describe('additionHint', () => {
  it('describes a simple addition with no carry', () => {
    expect(additionHint(12, 3)).toEqual([
      'Unités : 2 + 3 = 5.',
      'Dizaines : 1 + 0 = 1.',
      'Résultat : 12 + 3 = 15.',
    ]);
  });

  it('describes an addition with a single carry', () => {
    expect(additionHint(27, 15)).toEqual([
      'Unités : 7 + 5 = 12 → tu poses 2 et retiens 1.',
      'Dizaines : 2 + 1 + 1 (retenue) = 4.',
      'Résultat : 27 + 15 = 42.',
    ]);
  });

  it('describes a carry that overflows into a new column', () => {
    expect(additionHint(95, 8)).toEqual([
      'Unités : 5 + 8 = 13 → tu poses 3 et retiens 1.',
      'Dizaines : 9 + 0 + 1 (retenue) = 10 → tu poses 0 et retiens 1.',
      'Centaines : tu poses la retenue 1.',
      'Résultat : 95 + 8 = 103.',
    ]);
  });

  it('handles 3-digit numbers', () => {
    expect(additionHint(234, 567)).toEqual([
      'Unités : 4 + 7 = 11 → tu poses 1 et retiens 1.',
      'Dizaines : 3 + 6 + 1 (retenue) = 10 → tu poses 0 et retiens 1.',
      'Centaines : 2 + 5 + 1 (retenue) = 8.',
      'Résultat : 234 + 567 = 801.',
    ]);
  });
});

describe('subtractionHint', () => {
  it('describes a simple subtraction with no borrow', () => {
    expect(subtractionHint(38, 15)).toEqual([
      'Unités : 8 - 5 = 3.',
      'Dizaines : 3 - 1 = 2.',
      'Résultat : 38 - 15 = 23.',
    ]);
  });

  it('describes a subtraction with a single borrow', () => {
    expect(subtractionHint(42, 15)).toEqual([
      'Unités : Tu ne peux pas faire 2 - 5, tu empruntes 1 à la colonne suivante : 12 - 5 = 7.',
      'Dizaines : 3 - 1 = 2.',
      'Résultat : 42 - 15 = 27.',
    ]);
  });

  it('describes a borrow cascading through a zero digit', () => {
    expect(subtractionHint(100, 45)).toEqual([
      'Unités : Tu ne peux pas faire 0 - 5, tu empruntes 1 à la colonne suivante : 10 - 5 = 5.',
      "Dizaines : la colonne précédente a emprunté, donc ici c'est 9. 9 - 4 = 5.",
      'Centaines : 0 - 0 = 0.',
      'Résultat : 100 - 45 = 55.',
    ]);
  });
});

describe('multiplicationHint', () => {
  it('uses repeated addition when the smaller factor is 5 or less', () => {
    expect(multiplicationHint(2, 5)).toEqual([
      "2 × 5, c'est 5 répété 2 fois : 5 + 5 = 10.",
      'Résultat : 2 × 5 = 10.',
    ]);
  });

  it('references the multiplication table for two distinct larger factors', () => {
    expect(multiplicationHint(6, 7)).toEqual([
      '6 × 7 : utilise ta table de multiplication de 6 (ou de 7).',
      'Résultat : 6 × 7 = 42.',
    ]);
  });

  it('references a single table when both larger factors are equal', () => {
    expect(multiplicationHint(6, 6)).toEqual([
      '6 × 6 : utilise ta table de multiplication de 6.',
      'Résultat : 6 × 6 = 36.',
    ]);
  });
});

describe('divisionHint', () => {
  it('lists the multiples up to the dividend', () => {
    expect(divisionHint(12, 3)).toEqual([
      '12 ÷ 3 : combien de fois 3 dans 12 ? Compte les multiples de 3 : 3, 6, 9, 12.',
      'Résultat : 12 ÷ 3 = 4.',
    ]);
  });

  it('handles a quotient of 1', () => {
    expect(divisionHint(5, 5)).toEqual([
      '5 ÷ 5 : combien de fois 5 dans 5 ? Compte les multiples de 5 : 5.',
      'Résultat : 5 ÷ 5 = 1.',
    ]);
  });

  it('handles the maximum quotient of 10', () => {
    expect(divisionHint(20, 2)).toEqual([
      '20 ÷ 2 : combien de fois 2 dans 20 ? Compte les multiples de 2 : 2, 4, 6, 8, 10, 12, 14, 16, 18, 20.',
      'Résultat : 20 ÷ 2 = 10.',
    ]);
  });
});

describe('dynamicHintSteps', () => {
  it('routes to additionHint for addition questions', () => {
    expect(dynamicHintSteps({ type: 'addition', a: 12, b: 3 })).toEqual(additionHint(12, 3));
  });

  it('routes to subtractionHint for soustraction questions', () => {
    expect(dynamicHintSteps({ type: 'soustraction', a: 38, b: 15 })).toEqual(subtractionHint(38, 15));
  });

  it('routes to multiplicationHint for multiplication questions', () => {
    expect(dynamicHintSteps({ type: 'multiplication', a: 6, b: 7 })).toEqual(multiplicationHint(6, 7));
  });

  it('routes to divisionHint for division questions', () => {
    expect(dynamicHintSteps({ type: 'division', a: 12, b: 3 })).toEqual(divisionHint(12, 3));
  });

  it('returns null for comparaison questions', () => {
    expect(dynamicHintSteps({ type: 'comparaison', a: 4, b: 7 })).toBe(null);
  });

  it('returns null for fraction questions', () => {
    expect(dynamicHintSteps({ type: 'fraction', a: { numerator: 1, denominator: 3 }, b: { numerator: 2, denominator: 3 } })).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/child/hints.test.js`
Expected: FAIL — cannot find module `../../src/child/hints.js`

- [ ] **Step 3: Write the implementation**

Create `src/child/hints.js`:

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/child/hints.test.js`
Expected: PASS (19 tests: 4 `additionHint` + 3 `subtractionHint` + 3 `multiplicationHint` + 3 `divisionHint` + 6 `dynamicHintSteps`)

- [ ] **Step 5: Commit**

```bash
git add src/child/hints.js tests/child/hints.test.js
git commit -m "feat: add dynamic step-by-step hints for the 4 arithmetic operations (TDD)"
```

---

### Task 2: CSS for the hint steps list

**Files:**
- Modify: `src/child/style.css`

The current end of `src/child/style.css` is:

```css
.help-entry {
  margin-bottom: 16px;
}

.help-entry h3 {
  margin-bottom: 4px;
}
```

- [ ] **Step 1: Append to the end of `src/child/style.css`**

```css

.help-steps {
  text-align: left;
  padding-left: 20px;
  margin: 8px 0 16px;
}

.help-steps li {
  margin-bottom: 6px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add styles for the dynamic hint steps list"
```

---

### Task 3: Integrate dynamic hints into the help overlay

**Files:**
- Modify: `src/child/ui.js`

The current content of the relevant parts of `src/child/ui.js` is:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
```

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

- [ ] **Step 1: Add the `dynamicHintSteps` import**

Replace:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
```

with:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { dynamicHintSteps } from './hints.js';
```

- [ ] **Step 2: Update `helpOverlayHtml` to render the dynamic steps**

Replace the full `helpOverlayHtml` function with:

```js
function helpOverlayHtml(type, question) {
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
  const hintSteps = dynamicHintSteps(question);
  return `
    <div class="help-overlay">
      <div class="help-card">
        <h2>${emojiForType(type)} Aide</h2>
        <p>${helpTextForType(type)}</p>
        ${hintSteps ? `<ol class="help-steps">${hintSteps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
        <button id="help-close" class="big-button">Fermer</button>
      </div>
    </div>`;
}
```

- [ ] **Step 3: Pass the question object at the two single-notion call sites**

In `renderQuestion`, find:

```js
      ${showHelp ? helpOverlayHtml(question.type) : ''}
```

Replace with:

```js
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
```

In `renderQuestionQcm`, find the identical line and apply the identical replacement:

```js
      ${showHelp ? helpOverlayHtml(question.type) : ''}
```

Replace with:

```js
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
```

`renderPairsRound`'s `${showHelp ? helpOverlayHtml(null) : ''}` is UNCHANGED — the `type === null` branch never reads its second parameter, so no update is needed there. `renderPairing`, `renderHome`, `customizeMedallionHtml`, `renderCustomize`, `renderResults`, `renderConnectionError` are all unchanged.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass (this task adds no new tests to `ui.js` itself — its rendering functions aren't unit-tested in this project; `hints.js`'s own tests from Task 1 continue to pass unchanged). Expect 178 tests total (159 existing + 19 from Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render dynamic hint steps in the help overlay"
```

---

### Task 4: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, 178 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing).

- [ ] **Step 3: Verify the dynamic hint for addition, soustraction, multiplication, division**

Play until each of the 4 arithmetic types comes up (classic quiz or QCM mode), tap "❓", and confirm the numbered list of steps appears below the generic text, with numbers matching the actual question on screen, ending in a "Résultat : ..." line matching the correct answer.

- [ ] **Step 4: Verify comparaison and fraction are unaffected**

Confirm the help overlay for `comparaison` and `fraction` questions shows only the generic text, no numbered steps list (since `dynamicHintSteps` returns `null` for these types).

- [ ] **Step 5: Verify the pairs mode "all notions" view is unaffected**

Confirm the pairs mode help overlay still shows the 6 generic notion explanations, with no dynamic steps anywhere in that view.

- [ ] **Step 6: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-5 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
