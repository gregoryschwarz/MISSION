# Notion problèmes (énoncés) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an 11th question type — "probleme" (French word problems for addition/subtraction) — to "Missions d'Ambre", fully integrated like the existing 10 notions.

**Architecture:** A new pure module `src/child/wordProblems.js` holds a name+pronoun catalog, an object catalog, and sentence templates for addition and subtraction. A new generator `generateWordProblem(level)` in `src/child/questions.js` delegates the actual numbers to the existing `generateAddition`/`generateSubtraction` generators (reusing their tested level-scaling logic) and wraps the result in a sentence. The dynamic-hint system in `src/child/hints.js` gains a case that delegates to the existing `additionHint`/`subtractionHint` functions based on which operation the problem used. All other integration points (difficulty, progression, badges, help text, parent dashboard) follow the exact pattern already used for the previous 4 notions added this project (geometrie, monnaie, longueur, temps) — no changes needed to `choices.js`, `pairsGame.js`, or `ui.js`'s visual rendering, since this type has a purely textual prompt and a numeric answer.

**Tech Stack:** Vite + vanilla JavaScript, Vitest (TDD), Firebase Hosting for deployment.

---

### Task PB-1: Word problem sentence templates (TDD)

**Files:**
- Create: `src/child/wordProblems.js`
- Test: `tests/child/wordProblems.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/wordProblems.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { NAMES, OBJECTS, wordProblemText } from '../../src/child/wordProblems.js';

describe('wordProblemText', () => {
  it('produces a non-empty addition statement containing both numbers', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 12, 5);
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('12');
      expect(text).toContain('5');
    }
  });

  it('produces a non-empty subtraction statement containing both numbers', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('soustraction', 20, 7);
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('20');
      expect(text).toContain('7');
    }
  });

  it('never leaves an unfilled template placeholder', () => {
    for (let i = 0; i < 30; i++) {
      expect(wordProblemText('addition', 10, 3)).not.toMatch(/[{}]/);
      expect(wordProblemText('soustraction', 10, 3)).not.toMatch(/[{}]/);
    }
  });

  it('always starts with an uppercase letter', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 8, 2);
      expect(text[0]).toBe(text[0].toUpperCase());
    }
  });

  it('only uses names and objects from the known catalogues', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 9, 4);
      const nameFound = NAMES.some((n) => text.includes(n.name));
      const objectFound = OBJECTS.some((o) => text.includes(o));
      expect(nameFound || objectFound).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- wordProblems`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create `src/child/wordProblems.js`**

```js
import { randomInt } from './random.js';

export const NAMES = [
  { name: 'Léa', pronoun: 'elle' },
  { name: 'Emma', pronoun: 'elle' },
  { name: 'Chloé', pronoun: 'elle' },
  { name: 'Tom', pronoun: 'il' },
  { name: 'Lucas', pronoun: 'il' },
  { name: 'Nathan', pronoun: 'il' },
];

export const OBJECTS = ['bonbons', 'billes', 'images', 'cartes de jeu', 'gommes', 'autocollants'];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const ADDITION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en reçoit ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en trouve ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `Dans un panier, il y a ${a} ${object}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`,
];

export const SUBTRACTION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en donne ${b} à son ami. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `${name} avait ${a} ${object}. ${capitalize(pronoun)} en a perdu ${b}. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `Il y a ${a} ${object} dans une boîte. On en retire ${b}. Combien en reste-t-il ?`,
];

export function wordProblemText(operation, a, b) {
  const { name, pronoun } = NAMES[randomInt(0, NAMES.length - 1)];
  const object = OBJECTS[randomInt(0, OBJECTS.length - 1)];
  const templates = operation === 'addition' ? ADDITION_TEMPLATES : SUBTRACTION_TEMPLATES;
  const template = templates[randomInt(0, templates.length - 1)];
  return template(name, pronoun, object, a, b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- wordProblems`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/wordProblems.js tests/child/wordProblems.test.js
git commit -m "feat: add word problem sentence templates for addition and subtraction (TDD)"
```

---

### Task PB-2: generateWordProblem and mission integration (TDD)

**Files:**
- Modify: `src/child/questions.js`
- Test: `tests/child/questions.test.js`

- [ ] **Step 1: Write the failing tests**

In `tests/child/questions.test.js`, update the import block at the top:

```js
import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateDivision,
  generateFraction,
  generateGeometry,
  generateMoney,
  generateLength,
  generateTime,
  generateWordProblem,
  generateMission,
} from '../../src/child/questions.js';
import { SHAPES, shapeSides } from '../../src/child/shapes.js';
import { COINS } from '../../src/child/money.js';
import { formatTime } from '../../src/child/clock.js';
```

Add this new `describe` block right after the existing `describe('generateTime', ...)` block (before `describe('generateMission', ...)`):

```js
describe('generateWordProblem', () => {
  it('always uses addition or soustraction as the underlying operation', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateWordProblem();
      expect(['addition', 'soustraction']).toContain(q.operation);
    }
  });

  it('has type "probleme" and a non-empty textual prompt', () => {
    const q = generateWordProblem();
    expect(q.type).toBe('probleme');
    expect(q.prompt.length).toBeGreaterThan(0);
  });

  it('answers with a + b when the operation is addition', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateWordProblem();
      if (q.operation === 'addition') {
        expect(q.answer).toBe(q.a + q.b);
      }
    }
  });

  it('answers with a - b when the operation is soustraction', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateWordProblem();
      if (q.operation === 'soustraction') {
        expect(q.answer).toBe(q.a - q.b);
      }
    }
  });

  it('includes both numbers in the prompt text', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateWordProblem();
      expect(q.prompt).toContain(String(q.a));
      expect(q.prompt).toContain(String(q.b));
    }
  });
});
```

Then update the two tests inside `describe('generateMission', ...)` that enumerate types:

```js
  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = [
      'addition', 'soustraction', 'multiplication', 'comparaison', 'division',
      'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme',
    ];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });

  it('cycles through all 11 types when given enough questions', () => {
    const mission = generateMission(11);
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual([
      'addition',
      'comparaison',
      'division',
      'fraction',
      'geometrie',
      'longueur',
      'monnaie',
      'multiplication',
      'probleme',
      'soustraction',
      'temps',
    ]);
  });
```

Do **not** change `describe('generateMission with a focusType', ...)` — leave it byte-identical. `probleme` is appended at the very end of the round-robin `types` array, so `otherTypes[0..2]` (what those tests rely on) is still exactly `['addition', 'soustraction', 'multiplication']`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- questions`
Expected: FAIL with "generateWordProblem is not defined" (and the two updated `generateMission` tests also fail).

- [ ] **Step 3: Implement the generator and wire it into `generateMission`**

In `src/child/questions.js`, add this import alongside the existing ones at the top:

```js
import { wordProblemText } from './wordProblems.js';
```

Add this code right after `generateTime` and before `const GENERATORS = {`:

```js
export function generateWordProblem(level = 1) {
  const operation = randomInt(0, 1) === 0 ? 'addition' : 'soustraction';
  const base = operation === 'addition' ? generateAddition(level) : generateSubtraction(level);
  const prompt = wordProblemText(operation, base.a, base.b);
  return { type: 'probleme', operation, a: base.a, b: base.b, answer: base.answer, prompt };
}
```

Update `GENERATORS`:

```js
const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
  division: generateDivision,
  fraction: generateFraction,
  geometrie: generateGeometry,
  monnaie: generateMoney,
  longueur: generateLength,
  temps: generateTime,
  probleme: generateWordProblem,
};
```

Update the `types` array inside `generateMission`:

```js
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- questions`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add generateWordProblem and wire it into mission generation (TDD)"
```

---

### Task PB-3: Session breakdown entry for probleme (TDD)

**Files:**
- Modify: `src/child/session.js:1-20`
- Test: `tests/child/session.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/child/session.test.js`, add after the `'initializes breakdown entries for monnaie, longueur, and temps'` test (still inside `describe('session flow', ...)`):

```js
  it('initializes a breakdown entry for probleme', () => {
    const session = createSession([]);
    expect(session.breakdown.probleme).toEqual({ correct: 0, total: 0 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session`
Expected: FAIL — `session.breakdown.probleme` is `undefined`.

- [ ] **Step 3: Add the breakdown entry**

In `src/child/session.js`, inside `createSession`'s `breakdown` object, add after `temps: { correct: 0, total: 0 },`:

```js
      probleme: { correct: 0, total: 0 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: add session breakdown entry for probleme (TDD)"
```

---

### Task PB-4: Default difficulty level for probleme (TDD)

**Files:**
- Modify: `src/shared/difficulty.js:6-17`
- Test: `tests/shared/difficulty.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/difficulty.test.js`, replace the `describe('DEFAULT_DIFFICULTY_LEVELS', ...)` block's expectation:

```js
describe('DEFAULT_DIFFICULTY_LEVELS', () => {
  it('starts every type at level 1', () => {
    expect(DEFAULT_DIFFICULTY_LEVELS).toEqual({
      addition: 1,
      soustraction: 1,
      multiplication: 1,
      comparaison: 1,
      division: 1,
      fraction: 1,
      geometrie: 1,
      monnaie: 1,
      longueur: 1,
      temps: 1,
      probleme: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- difficulty`
Expected: FAIL — the object is missing the `probleme` key.

- [ ] **Step 3: Update `DEFAULT_DIFFICULTY_LEVELS`**

In `src/shared/difficulty.js`, add after `temps: 1,`:

```js
  probleme: 1,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- difficulty`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/difficulty.js tests/shared/difficulty.test.js
git commit -m "feat: add default difficulty level for probleme (TDD)"
```

---

### Task PB-5: Mastery detection for probleme (TDD)

**Files:**
- Modify: `src/shared/progression.js:6`
- Test: `tests/shared/progression.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/progression.test.js`, add after the `'detects mastery for the new monnaie, longueur, and temps types too'` test (still inside `describe('newlyMasteredTypes', ...)`):

```js
  it('detects mastery for the new probleme type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 1, longueur: 1, temps: 1, probleme: 2 };
    const next = { ...previous, probleme: 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['probleme']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- progression`
Expected: FAIL — `newlyMasteredTypes` returns `[]` since `probleme` isn't in `OPERATION_TYPES` yet.

- [ ] **Step 3: Update `OPERATION_TYPES`**

In `src/shared/progression.js`, line 6, replace:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps'];
```

with:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- progression`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: detect mastery for probleme (TDD)"
```

---

### Task PB-6: Mastery badge for probleme (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Test: `tests/shared/badges.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/badges.test.js`, update the `'defines all 16 badges...'` test's expected id list and rename it:

```js
  it('defines all 17 badges with a category, in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'streak-3',
      'streak-7',
      'streak-30',
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
      'mastery-division',
      'mastery-fraction',
      'mastery-geometrie',
      'mastery-monnaie',
      'mastery-longueur',
      'mastery-temps',
      'mastery-probleme',
      'perfect-1',
      'perfect-10',
      'perfect-50',
    ]);
  });
```

Update the `toHaveLength(16)` call in `describe('badgeMedallionData', ...)` (in the `'marks badges as earned when their id is present'` test) to `toHaveLength(17)`.

Add after the `'renders the monnaie, longueur, and temps mastery badges when earned'` test (still inside `describe('renderBadgeMedallionsHtml', ...)`):

```js
  it('renders the probleme mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-probleme']);
    expect(html).toContain('📖');
  });
```

Update `describe('emojiForType', ...)`'s first test:

```js
  it('returns the correct emoji for each of the 11 mastery types', () => {
    expect(emojiForType('addition')).toBe('➕');
    expect(emojiForType('soustraction')).toBe('➖');
    expect(emojiForType('multiplication')).toBe('✖️');
    expect(emojiForType('comparaison')).toBe('⚖️');
    expect(emojiForType('division')).toBe('➗');
    expect(emojiForType('fraction')).toBe('🍕');
    expect(emojiForType('geometrie')).toBe('📐');
    expect(emojiForType('monnaie')).toBe('💰');
    expect(emojiForType('longueur')).toBe('📏');
    expect(emojiForType('temps')).toBe('🕐');
    expect(emojiForType('probleme')).toBe('📖');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- badges`
Expected: FAIL — `mastery-probleme` doesn't exist yet.

- [ ] **Step 3: Add the new badge**

In `src/shared/badges.js`, add to `BADGES` after the `mastery-temps` entry and before `perfect-1`:

```js
  { id: 'mastery-probleme', category: 'maitrise', emoji: '📖', label: 'Problèmes maîtrisés', gradient: ['#6a1b9a', '#ab47bc'] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- badges`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add mastery-probleme badge (TDD)"
```

**Note for the code-quality reviewer:** explicitly re-verify that `['#6a1b9a', '#ab47bc']` (deep purple/magenta) doesn't visually collide with any of the 16 existing badge gradients — in particular `mastery-comparaison` (`['#cdb4db', '#ffc8dd']`, pastel lavender/pink) and `streak-7` (`['#c9b8ff', '#8fd6ff']`, pastel periwinkle/sky), which are the closest in hue family. This is the same check that caught real collisions in the géométrie and mesures sub-projects — adjust the color if it reads as a near-duplicate.

---

### Task PB-7: Help text for probleme (TDD)

**Files:**
- Modify: `src/shared/helpContent.js`
- Test: `tests/shared/helpContent.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/helpContent.test.js`, update the expected key list:

```js
describe('HELP_TEXT', () => {
  it('defines a help text for each of the 11 question types, in a fixed order', () => {
    expect(Object.keys(HELP_TEXT)).toEqual([
      'addition',
      'soustraction',
      'multiplication',
      'comparaison',
      'division',
      'fraction',
      'geometrie',
      'monnaie',
      'longueur',
      'temps',
      'probleme',
    ]);
  });
});
```

(`helpTextForType`'s test already iterates `Object.keys(HELP_TEXT)` generically, so it covers the new entry with no change needed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- helpContent`
Expected: FAIL — the `probleme` key is missing.

- [ ] **Step 3: Add the help text**

In `src/shared/helpContent.js`, add to `HELP_TEXT` after the `temps` entry:

```js
  probleme:
    "Pour résoudre un problème, repère d'abord les nombres et ce qu'on te demande : est-ce qu'on ajoute (le total augmente) ou est-ce qu'on retire (il en reste moins) ? Une fois l'opération choisie, calcule comme d'habitude.",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- helpContent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/helpContent.js tests/shared/helpContent.test.js
git commit -m "feat: add generic help text for probleme (TDD)"
```

---

### Task PB-8: Dynamic hint delegation for probleme (TDD)

**Files:**
- Modify: `src/child/hints.js:92-105`
- Test: `tests/child/hints.test.js`

- [ ] **Step 1: Write the failing tests**

In `tests/child/hints.test.js`, add after the `'returns null for fraction questions'` test (still inside `describe('dynamicHintSteps', ...)`):

```js
  it('delegates to additionHint for probleme questions with operation addition', () => {
    const question = { type: 'probleme', operation: 'addition', a: 12, b: 3 };
    expect(dynamicHintSteps(question)).toEqual(additionHint(12, 3));
  });

  it('delegates to subtractionHint for probleme questions with operation soustraction', () => {
    const question = { type: 'probleme', operation: 'soustraction', a: 38, b: 15 };
    expect(dynamicHintSteps(question)).toEqual(subtractionHint(38, 15));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- hints`
Expected: FAIL — `dynamicHintSteps` returns `null` for `'probleme'` (falls into the `default` case) instead of delegating.

- [ ] **Step 3: Add the `probleme` case**

In `src/child/hints.js`, inside `dynamicHintSteps`'s `switch (question.type)`, add before `default: return null;`:

```js
    case 'probleme':
      return question.operation === 'addition'
        ? additionHint(question.a, question.b)
        : subtractionHint(question.a, question.b);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- hints`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/hints.js tests/child/hints.test.js
git commit -m "feat: delegate dynamic hint steps for probleme to additionHint/subtractionHint (TDD)"
```

---

### Task PB-9: Add probleme to the parent focus-selector

**Files:**
- Modify: `src/parent/dashboard.js:91`

- [ ] **Step 1: Update `NOTION_TYPES`**

In `src/parent/dashboard.js`, replace:

```js
const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps'];
```

with:

```js
const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme'];
```

(No test needed — `NOTION_TYPES` is only used inside `renderDashboard`, which is DOM orchestration and untested by convention, same as the géométrie and mesures sub-projects' equivalent tasks.)

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/parent/dashboard.js
git commit -m "feat: add probleme to the parent focus-selector"
```

---

### Task PB-10: Add probleme to the child home-screen focus banner

**Files:**
- Modify: `src/child/ui.js` (the `FOCUS_LABELS` constant)

- [ ] **Step 1: Update `FOCUS_LABELS`**

In `src/child/ui.js`, replace:

```js
const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
  geometrie: 'la géométrie',
  monnaie: 'la monnaie',
  longueur: 'les longueurs',
  temps: "l'heure",
};
```

with:

```js
const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
  geometrie: 'la géométrie',
  monnaie: 'la monnaie',
  longueur: 'les longueurs',
  temps: "l'heure",
  probleme: 'les problèmes',
};
```

(No test needed — `ui.js` has no dedicated tests, per project convention.)

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: add probleme to the child home-screen focus banner"
```

---

### Task PB-11: Manual verification and deploy

**Files:** None (verification and deployment task)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all test files green.

- [ ] **Step 2: Manual verification (if the user is available to pair)**

If the user can log in and enter the child PIN themselves, verify on `npm run dev`:
- A "probleme" question shows a full French sentence, with a plausible name/object/numbers, and accepts the correct numeric answer.
- The "❓ Aide" button on a probleme question shows the same step-by-step numeric hint as the equivalent bare addition/soustraction question.
- "probleme" appears in the pairs-matching ("chasse aux paires") format as a text tile, matched correctly against its numeric result.
- The parent dashboard shows "probleme" in "Réussite par notion", the weekly heat-map, and the priority selector.
- Earning `mastery-probleme` shows a distinct, non-colliding badge color.

If manual verification isn't possible this session (no PIN/password entry), rely on the test suite and code review, consistent with how every prior sub-project in this series was verified.

- [ ] **Step 3: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: Build succeeds, deploy succeeds, and the live URL (https://missions-de-luna.web.app) serves the updated bundle.

- [ ] **Step 4: Commit any final fixes discovered during verification**

Only if verification in Step 2 surfaced an issue — commit the fix with a `fix:` prefixed message before re-running Steps 1 and 3.
