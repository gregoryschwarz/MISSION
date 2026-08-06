# Notion géométrie (compter les côtés) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7th question type, "géométrie", where the child counts the sides of a displayed shape — fully integrated into mission generation, adaptive difficulty, mastery badges, the parent dashboard, and the help overlay, exactly like the 6 existing notions.

**Architecture:** A new pure module (`src/child/shapes.js`) owns the shape catalog (side counts + inline SVG markup). `src/child/questions.js` gains a `generateGeometry` generator and appends `'geometrie'` as the 7th (last) entry in its round-robin `types` list, so existing round-robin/focus-type tests for small mission sizes remain unaffected. Every other file that enumerates the 6 notions (`difficulty.js`, `progression.js`, `badges.js`, `helpContent.js`, `session.js`, `dashboard.js`, `ui.js`) gets the same one-line addition it got for `division`/`fraction` previously. `ui.js` and `pairsGame.js` gain the actual visual rendering of the shape.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Shape catalog (TDD)

**Files:**
- Create: `src/child/shapes.js`
- Test: `tests/child/shapes.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/shapes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SHAPES, shapeSvg, shapeSides } from '../../src/child/shapes.js';

describe('SHAPES', () => {
  it('defines the 7 shapes used across the 3 difficulty levels', () => {
    expect(Object.keys(SHAPES).sort()).toEqual([
      'carre',
      'cercle',
      'hexagone',
      'losange',
      'pentagone',
      'rectangle',
      'triangle',
    ]);
  });
});

describe('shapeSides', () => {
  it('returns the correct side count for each shape', () => {
    expect(shapeSides('cercle')).toBe(0);
    expect(shapeSides('triangle')).toBe(3);
    expect(shapeSides('carre')).toBe(4);
    expect(shapeSides('rectangle')).toBe(4);
    expect(shapeSides('losange')).toBe(4);
    expect(shapeSides('pentagone')).toBe(5);
    expect(shapeSides('hexagone')).toBe(6);
  });

  it('returns 0 for an unknown shape id', () => {
    expect(shapeSides('unknown')).toBe(0);
  });
});

describe('shapeSvg', () => {
  it('returns non-empty SVG markup for every known shape', () => {
    Object.keys(SHAPES).forEach((id) => {
      expect(shapeSvg(id)).toContain('<svg');
    });
  });

  it('returns an empty string for an unknown shape id', () => {
    expect(shapeSvg('unknown')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/shapes.test.js`
Expected: FAIL — cannot find module `../../src/child/shapes.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/shapes.js`:

```js
export const SHAPES = {
  cercle: { sides: 0, svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#a2d2ff"/></svg>' },
  triangle: { sides: 3, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="#ffb4a2"/></svg>' },
  carre: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" fill="#a8e6cf"/></svg>' },
  rectangle: { sides: 4, svg: '<svg viewBox="0 0 100 100"><rect x="10" y="25" width="80" height="50" fill="#ffe5a0"/></svg>' },
  losange: { sides: 4, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,50 50,90 10,50" fill="#cdb4db"/></svg>' },
  pentagone: { sides: 5, svg: '<svg viewBox="0 0 100 100"><polygon points="50,10 90,40 75,90 25,90 10,40" fill="#ff9a8b"/></svg>' },
  hexagone: { sides: 6, svg: '<svg viewBox="0 0 100 100"><polygon points="30,10 70,10 90,50 70,90 30,90 10,50" fill="#84fab0"/></svg>' },
};

export function shapeSvg(shapeId) {
  return SHAPES[shapeId]?.svg ?? '';
}

export function shapeSides(shapeId) {
  return SHAPES[shapeId]?.sides ?? 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/shapes.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/shapes.js tests/child/shapes.test.js
git commit -m "feat: add geometry shape catalog with side counts and SVG (TDD)"
```

---

### Task 2: `generateGeometry` and mission integration (TDD)

**Files:**
- Modify: `src/child/questions.js`
- Modify: `tests/child/questions.test.js`

The current content of `src/child/questions.js` is:

```js
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { randomInt, shuffle } from './random.js';

// Powers of ten (10, 100, ...) have only one nonzero digit worth 1: every
// digit-respecting subtrahend is therefore either 0 or the number itself, so
// no valid (positive, non-borrowing, non-trivial) subtraction exists for them.
function isPowerOfTen(n) {
  return /^10*$/.test(String(n));
}

// Picks each digit of b independently in [0, corresponding digit of a], which
// guarantees no borrowing. Rejects the all-zero (b === 0) and all-matching
// (b === a) outcomes so the difference is always strictly positive. Callers
// must not pass a power of ten (see isPowerOfTen) or this loop cannot terminate.
function noBorrowSubtrahend(a) {
  const digits = String(a).split('').map(Number);
  let bDigits;
  do {
    bDigits = digits.map((d) => randomInt(0, d));
  } while (bDigits.every((d) => d === 0) || bDigits.every((d, i) => d === digits[i]));
  return Number(bDigits.join(''));
}

const ADDITION_MAX_SUM = { 1: 100, 2: 200, 3: 999 };

export function generateAddition(level = 1) {
  const maxSum = ADDITION_MAX_SUM[level] ?? ADDITION_MAX_SUM[1];
  const a = randomInt(10, maxSum - 20);
  const b = randomInt(1, maxSum - 1 - a);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

const SUBTRACTION_NO_BORROW_MAX = { 1: 100, 2: 200 };

export function generateSubtraction(level = 1) {
  if (level >= 3) {
    const a = randomInt(100, 998);
    const b = randomInt(1, a - 1);
    return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
  }
  const maxValue = SUBTRACTION_NO_BORROW_MAX[level] ?? SUBTRACTION_NO_BORROW_MAX[1];
  let a;
  do {
    a = randomInt(10, maxValue - 1);
  } while (isPowerOfTen(a));
  const b = noBorrowSubtrahend(a);
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

const MULTIPLICATION_TABLES_BY_LEVEL = {
  1: [2, 5, 10],
  2: [2, 3, 4, 5, 10],
  3: [2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export function generateMultiplication(level = 1) {
  const tables = MULTIPLICATION_TABLES_BY_LEVEL[level] ?? MULTIPLICATION_TABLES_BY_LEVEL[1];
  const table = tables[randomInt(0, tables.length - 1)];
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

const COMPARISON_MAX = { 1: 99, 2: 499, 3: 998 };

export function generateComparison(level = 1) {
  const max = COMPARISON_MAX[level] ?? COMPARISON_MAX[1];
  const a = randomInt(1, max);
  let b = randomInt(1, max);
  while (b === a) b = randomInt(1, max);
  const answer = a > b ? '>' : '<';
  return { type: 'comparaison', a, b, answer, prompt: `${a} ___ ${b}`, options: ['>', '<'] };
}

export function generateDivision(level = 1) {
  const tables = MULTIPLICATION_TABLES_BY_LEVEL[level] ?? MULTIPLICATION_TABLES_BY_LEVEL[1];
  const table = tables[randomInt(0, tables.length - 1)];
  const factor = randomInt(1, 10);
  const dividend = table * factor;
  return { type: 'division', a: dividend, b: table, answer: factor, prompt: `${dividend} ÷ ${table}` };
}

const FRACTION_DENOMINATORS_BY_LEVEL = {
  1: [3, 4],
  2: [3, 4, 6],
  3: [3, 4, 6, 8, 10],
};

export function generateFraction(level = 1) {
  const denominators = FRACTION_DENOMINATORS_BY_LEVEL[level] ?? FRACTION_DENOMINATORS_BY_LEVEL[1];
  const denominator = denominators[randomInt(0, denominators.length - 1)];
  let numeratorA = randomInt(1, denominator - 1);
  let numeratorB = randomInt(1, denominator - 1);
  while (numeratorB === numeratorA) numeratorB = randomInt(1, denominator - 1);
  const answer = numeratorA > numeratorB ? '>' : '<';
  return {
    type: 'fraction',
    a: { numerator: numeratorA, denominator },
    b: { numerator: numeratorB, denominator },
    answer,
    prompt: `${numeratorA}/${denominator} ___ ${numeratorB}/${denominator}`,
    options: ['>', '<'],
  };
}

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
  division: generateDivision,
  fraction: generateFraction,
};

const FOCUS_RATIO = 0.7;

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS, focusType = null) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
  const hasFocus = focusType && types.includes(focusType);
  const focusCount = hasFocus ? Math.round(count * FOCUS_RATIO) : 0;
  const otherTypes = hasFocus ? types.filter((t) => t !== focusType) : types;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = i < focusCount ? focusType : otherTypes[(i - focusCount) % otherTypes.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

- [ ] **Step 1: Write the failing tests**

The current content of `tests/child/questions.test.js` starts with:

```js
import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateDivision,
  generateFraction,
  generateMission,
} from '../../src/child/questions.js';
```

Replace this import block with:

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
  generateMission,
} from '../../src/child/questions.js';
import { SHAPES, shapeSides } from '../../src/child/shapes.js';
```

Add this new `describe` block right after the existing `describe('generateFraction', ...)` block (before `describe('generateMission', ...)`):

```js
describe('generateGeometry', () => {
  it('picks only from triangle, carre, cercle at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry();
      expect(q.type).toBe('geometrie');
      expect(['triangle', 'carre', 'cercle']).toContain(q.shape);
      expect(q.answer).toBe(shapeSides(q.shape));
    }
  });

  it('adds rectangle and losange at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(2);
      expect(['triangle', 'carre', 'cercle', 'rectangle', 'losange']).toContain(q.shape);
    }
  });

  it('adds pentagone and hexagone at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(3);
      expect(Object.keys(SHAPES)).toContain(q.shape);
    }
  });

  it('always answers with the real side count of the drawn shape', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(3);
      expect(q.answer).toBe(SHAPES[q.shape].sides);
    }
  });
});
```

In the existing `describe('generateMission', ...)` block, find:

```js
  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });

  it('cycles through all 6 types when given enough questions', () => {
    const mission = generateMission(6);
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual(['addition', 'comparaison', 'division', 'fraction', 'multiplication', 'soustraction']);
  });
```

Replace with:

```js
  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie'];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });

  it('cycles through all 7 types when given enough questions', () => {
    const mission = generateMission(7);
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual([
      'addition',
      'comparaison',
      'division',
      'fraction',
      'geometrie',
      'multiplication',
      'soustraction',
    ]);
  });
```

Everything else in the file (the `generateAddition`/`generateSubtraction`/`generateMultiplication`/`generateComparison`/`generateDivision`/`generateFraction` describe blocks, and the entire `describe('generateMission with a focusType', ...)` block) is UNCHANGED — géométrie is appended as the 7th (last) entry in the internal `types` array, so every existing test in that block (which uses mission sizes of 6 or 10) never reaches index 6 and keeps producing byte-identical results. Do not touch them.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/child/questions.test.js`
Expected: FAIL — `generateGeometry` is not exported from `src/child/questions.js`; the two updated `generateMission` tests fail because `'geometrie'` isn't produced yet.

- [ ] **Step 3: Write the implementation**

Add this import at the top of `src/child/questions.js`, right after the existing imports:

```js
import { shapeSides } from './shapes.js';
```

So the top of the file becomes:

```js
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { randomInt, shuffle } from './random.js';
import { shapeSides } from './shapes.js';
```

Add this new generator right after `generateFraction` (before `const GENERATORS = {`):

```js
const GEOMETRY_SHAPES_BY_LEVEL = {
  1: ['triangle', 'carre', 'cercle'],
  2: ['triangle', 'carre', 'cercle', 'rectangle', 'losange'],
  3: ['triangle', 'carre', 'cercle', 'rectangle', 'losange', 'pentagone', 'hexagone'],
};

export function generateGeometry(level = 1) {
  const shapes = GEOMETRY_SHAPES_BY_LEVEL[level] ?? GEOMETRY_SHAPES_BY_LEVEL[1];
  const shape = shapes[randomInt(0, shapes.length - 1)];
  return { type: 'geometrie', shape, answer: shapeSides(shape), prompt: 'Combien de côtés a cette forme ?' };
}
```

Update `GENERATORS` to add the new entry:

```js
const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
  division: generateDivision,
  fraction: generateFraction,
  geometrie: generateGeometry,
};
```

Update `generateMission`'s `types` array (the only line that changes in this function):

```js
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/child/questions.test.js`
Expected: PASS (all tests, including the 4 new `generateGeometry` tests and the 2 updated `generateMission` tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add generateGeometry and wire it into mission generation (TDD)"
```

---

### Task 3: Session breakdown entry for géométrie (TDD)

**Files:**
- Modify: `src/child/session.js`
- Modify: `tests/child/session.test.js`

The current content of `src/child/session.js` is:

```js
export function createSession(questions) {
  return {
    questions,
    index: 0,
    correctCount: 0,
    breakdown: {
      addition: { correct: 0, total: 0 },
      soustraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      comparaison: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      fraction: { correct: 0, total: 0 },
    },
    startedAt: Date.now(),
  };
}

export function currentQuestion(session) {
  return session.questions[session.index];
}

export function isSessionComplete(session) {
  return session.index >= session.questions.length;
}

export function recordAnswer(session, question, isCorrect) {
  const breakdown = session.breakdown[question.type];
  breakdown.total += 1;
  if (isCorrect) {
    breakdown.correct += 1;
    session.correctCount += 1;
  }
  return isCorrect;
}

export function submitAnswer(session, answer) {
  if (isSessionComplete(session)) {
    throw new Error('Cannot submit answer: session is complete');
  }
  const question = currentQuestion(session);
  const isCorrect = answer === question.answer;
  recordAnswer(session, question, isCorrect);
  session.index += 1;
  return isCorrect;
}

export function finishSession(session) {
  const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
  return {
    date: new Date().toISOString().slice(0, 10),
    questionsTotal: session.questions.length,
    correctCount: session.correctCount,
    durationSeconds,
    breakdown: session.breakdown,
  };
}
```

`recordAnswer` does `session.breakdown[question.type]` and then increments `.total`/`.correct` on it — if `question.type` is `'geometrie'` and `breakdown.geometrie` doesn't exist, this throws (`Cannot read properties of undefined`). This is a required, load-bearing fix — without it, finishing any mission containing a géométrie question crashes.

- [ ] **Step 1: Write the failing test**

In `tests/child/session.test.js`, find:

```js
  it('initializes breakdown entries for division and fraction', () => {
    const session = createSession([]);
    expect(session.breakdown.division).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.fraction).toEqual({ correct: 0, total: 0 });
  });
```

Replace with:

```js
  it('initializes breakdown entries for division, fraction, and geometrie', () => {
    const session = createSession([]);
    expect(session.breakdown.division).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.fraction).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.geometrie).toEqual({ correct: 0, total: 0 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/session.test.js`
Expected: FAIL — `session.breakdown.geometrie` is `undefined`.

- [ ] **Step 3: Write the implementation**

In `src/child/session.js`, find `createSession`'s `breakdown` object:

```js
    breakdown: {
      addition: { correct: 0, total: 0 },
      soustraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      comparaison: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      fraction: { correct: 0, total: 0 },
    },
```

Replace with:

```js
    breakdown: {
      addition: { correct: 0, total: 0 },
      soustraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      comparaison: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      fraction: { correct: 0, total: 0 },
      geometrie: { correct: 0, total: 0 },
    },
```

Nothing else in the file changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/session.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: add geometrie session breakdown entry (TDD)"
```

---

### Task 4: Default difficulty level for géométrie (TDD)

**Files:**
- Modify: `src/shared/difficulty.js`
- Modify: `tests/shared/difficulty.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/difficulty.test.js`, find:

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
    });
  });
});
```

Replace with:

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
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: FAIL — `DEFAULT_DIFFICULTY_LEVELS` is missing the `geometrie` key.

- [ ] **Step 3: Write the implementation**

In `src/shared/difficulty.js`, find:

```js
export const DEFAULT_DIFFICULTY_LEVELS = {
  addition: 1,
  soustraction: 1,
  multiplication: 1,
  comparaison: 1,
  division: 1,
  fraction: 1,
};
```

Replace with:

```js
export const DEFAULT_DIFFICULTY_LEVELS = {
  addition: 1,
  soustraction: 1,
  multiplication: 1,
  comparaison: 1,
  division: 1,
  fraction: 1,
  geometrie: 1,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/difficulty.js tests/shared/difficulty.test.js
git commit -m "feat: add default difficulty level for geometrie (TDD)"
```

---

### Task 5: Mastery detection for géométrie (TDD)

**Files:**
- Modify: `src/shared/progression.js`
- Modify: `tests/shared/progression.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/progression.test.js`, find, inside `describe('newlyMasteredTypes', ...)`:

```js
  it('detects mastery for the new division and fraction types too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 2, fraction: 1 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 3, fraction: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['division']);
  });
```

Add this new test right after it, still inside the same `describe` block:

```js

  it('detects mastery for the new geometrie type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 2 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['geometrie']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: FAIL — `newlyMasteredTypes` doesn't check `geometrie` yet, so it returns `[]` instead of `['geometrie']`.

- [ ] **Step 3: Write the implementation**

In `src/shared/progression.js`, find:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
```

Replace with:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: detect mastery for the geometrie type (TDD)"
```

---

### Task 6: Mastery badge for géométrie (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Modify: `tests/shared/badges.test.js`

- [ ] **Step 1: Write the failing test**

The current content of `tests/shared/badges.test.js` is:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml, emojiForType } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 12 badges with a category, in a fixed order', () => {
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
      'perfect-1',
      'perfect-10',
      'perfect-50',
    ]);
  });

  it('assigns every badge to one of the 3 known categories', () => {
    const categoryIds = BADGE_CATEGORIES.map((c) => c.id);
    BADGES.forEach((badge) => expect(categoryIds).toContain(badge.category));
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3', 'mastery-division']);
    expect(result).toHaveLength(12);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-division')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'streak-7')).toMatchObject({ earned: false });
  });

  it('marks no badges as earned for an empty list', () => {
    const result = badgeMedallionData([]);
    result.forEach((b) => expect(b.earned).toBe(false));
  });

  it('preserves the fixed badge order regardless of input order', () => {
    const result = badgeMedallionData(['perfect-50', 'streak-3']);
    expect(result.map((b) => b.id)).toEqual(BADGES.map((b) => b.id));
  });
});

describe('renderBadgeMedallionsHtml', () => {
  it('renders an earned badge with its emoji and the earned class', () => {
    const html = renderBadgeMedallionsHtml(['streak-3']);
    expect(html).toContain('badge-medallion earned');
    expect(html).toContain('🔥');
  });

  it('renders a locked badge with a lock icon and the locked class', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('badge-medallion locked');
    expect(html).toContain('🔒');
  });

  it('groups badges into 3 category sections with the right titles', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('Série');
    expect(html).toContain('Maîtrise');
    expect(html).toContain('Missions parfaites');
  });

  it('renders the new division and fraction mastery badges when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-division', 'mastery-fraction']);
    expect(html).toContain('➗');
    expect(html).toContain('🍕');
  });
});

describe('emojiForType', () => {
  it('returns the correct emoji for each of the 6 mastery types', () => {
    expect(emojiForType('addition')).toBe('➕');
    expect(emojiForType('soustraction')).toBe('➖');
    expect(emojiForType('multiplication')).toBe('✖️');
    expect(emojiForType('comparaison')).toBe('⚖️');
    expect(emojiForType('division')).toBe('➗');
    expect(emojiForType('fraction')).toBe('🍕');
  });

  it('returns the fallback emoji for an unknown type', () => {
    expect(emojiForType('unknown')).toBe('❓');
  });
});
```

Replace the full file with:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml, emojiForType } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 13 badges with a category, in a fixed order', () => {
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
      'perfect-1',
      'perfect-10',
      'perfect-50',
    ]);
  });

  it('assigns every badge to one of the 3 known categories', () => {
    const categoryIds = BADGE_CATEGORIES.map((c) => c.id);
    BADGES.forEach((badge) => expect(categoryIds).toContain(badge.category));
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3', 'mastery-division']);
    expect(result).toHaveLength(13);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-division')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'streak-7')).toMatchObject({ earned: false });
  });

  it('marks no badges as earned for an empty list', () => {
    const result = badgeMedallionData([]);
    result.forEach((b) => expect(b.earned).toBe(false));
  });

  it('preserves the fixed badge order regardless of input order', () => {
    const result = badgeMedallionData(['perfect-50', 'streak-3']);
    expect(result.map((b) => b.id)).toEqual(BADGES.map((b) => b.id));
  });
});

describe('renderBadgeMedallionsHtml', () => {
  it('renders an earned badge with its emoji and the earned class', () => {
    const html = renderBadgeMedallionsHtml(['streak-3']);
    expect(html).toContain('badge-medallion earned');
    expect(html).toContain('🔥');
  });

  it('renders a locked badge with a lock icon and the locked class', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('badge-medallion locked');
    expect(html).toContain('🔒');
  });

  it('groups badges into 3 category sections with the right titles', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('Série');
    expect(html).toContain('Maîtrise');
    expect(html).toContain('Missions parfaites');
  });

  it('renders the new division and fraction mastery badges when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-division', 'mastery-fraction']);
    expect(html).toContain('➗');
    expect(html).toContain('🍕');
  });

  it('renders the geometrie mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-geometrie']);
    expect(html).toContain('📐');
  });
});

describe('emojiForType', () => {
  it('returns the correct emoji for each of the 7 mastery types', () => {
    expect(emojiForType('addition')).toBe('➕');
    expect(emojiForType('soustraction')).toBe('➖');
    expect(emojiForType('multiplication')).toBe('✖️');
    expect(emojiForType('comparaison')).toBe('⚖️');
    expect(emojiForType('division')).toBe('➗');
    expect(emojiForType('fraction')).toBe('🍕');
    expect(emojiForType('geometrie')).toBe('📐');
  });

  it('returns the fallback emoji for an unknown type', () => {
    expect(emojiForType('unknown')).toBe('❓');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: FAIL — `mastery-geometrie` is not in `BADGES`; counts are off by one.

- [ ] **Step 3: Write the implementation**

In `src/shared/badges.js`, find:

```js
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Fractions maîtrisées', gradient: ['#4ecdc4', '#a0e7e5'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
```

Replace with:

```js
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Fractions maîtrisées', gradient: ['#4ecdc4', '#a0e7e5'] },
  { id: 'mastery-geometrie', category: 'maitrise', emoji: '📐', label: 'Géométrie maîtrisée', gradient: ['#c3aed6', '#e0c3fc'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Run the full test suite to confirm no regressions elsewhere**

Run: `npx vitest run`
Expected: all test files pass — `badgeMedallionData`/`renderBadgeMedallionsHtml` are used by `src/child/ui.js` and `src/parent/dashboard.js`, but neither hardcodes a badge count, so this change doesn't break their rendering.

- [ ] **Step 6: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add mastery-geometrie badge (TDD)"
```

---

### Task 7: Help text for géométrie (TDD)

**Files:**
- Modify: `src/shared/helpContent.js`
- Modify: `tests/shared/helpContent.test.js`

- [ ] **Step 1: Write the failing test**

The current content of `tests/shared/helpContent.test.js` is:

```js
import { describe, it, expect } from 'vitest';
import { HELP_TEXT, helpTextForType } from '../../src/shared/helpContent.js';

describe('HELP_TEXT', () => {
  it('defines a help text for each of the 6 question types, in a fixed order', () => {
    expect(Object.keys(HELP_TEXT)).toEqual([
      'addition',
      'soustraction',
      'multiplication',
      'comparaison',
      'division',
      'fraction',
    ]);
  });
});

describe('helpTextForType', () => {
  it('returns the exact text defined in HELP_TEXT for each known type', () => {
    Object.keys(HELP_TEXT).forEach((type) => {
      expect(helpTextForType(type)).toBe(HELP_TEXT[type]);
    });
  });

  it('returns a fallback message for an unknown type', () => {
    expect(helpTextForType('unknown')).toBe("Pas d'aide disponible pour cette notion.");
  });
});
```

Replace the `describe('HELP_TEXT', ...)` block with:

```js
describe('HELP_TEXT', () => {
  it('defines a help text for each of the 7 question types, in a fixed order', () => {
    expect(Object.keys(HELP_TEXT)).toEqual([
      'addition',
      'soustraction',
      'multiplication',
      'comparaison',
      'division',
      'fraction',
      'geometrie',
    ]);
  });
});
```

The `describe('helpTextForType', ...)` block is unchanged — it already iterates over `Object.keys(HELP_TEXT)` dynamically, so it automatically covers `geometrie` once the new key exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/helpContent.test.js`
Expected: FAIL — `HELP_TEXT` is missing the `geometrie` key.

- [ ] **Step 3: Write the implementation**

In `src/shared/helpContent.js`, find:

```js
  fraction:
    "Pour comparer deux fractions, regarde le numérateur (le chiffre du haut) : si les dénominateurs (le chiffre du bas) sont pareils, la fraction avec le plus grand numérateur est la plus grande.",
};
```

Replace with:

```js
  fraction:
    "Pour comparer deux fractions, regarde le numérateur (le chiffre du haut) : si les dénominateurs (le chiffre du bas) sont pareils, la fraction avec le plus grand numérateur est la plus grande.",
  geometrie:
    "Pour compter les côtés d'une forme, regarde combien de segments droits (lignes) forment son contour. Le cercle n'a aucun côté droit : c'est une ligne courbe, donc 0 côté.",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/helpContent.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/helpContent.js tests/shared/helpContent.test.js
git commit -m "feat: add generic help text for geometrie (TDD)"
```

---

### Task 8: Transport the shape field on pairs tiles (TDD)

**Files:**
- Modify: `src/child/pairsGame.js`
- Modify: `tests/child/pairsGame.test.js`

The current content of `src/child/pairsGame.js`'s `createPairsRound` is:

```js
export function createPairsRound(questions) {
  const calcTiles = shuffle(
    questions.map((q, i) => ({ id: `calc-${i}`, pairKey: i, type: q.type, prompt: q.prompt, answer: q.answer }))
  );
  const resultTiles = shuffle(
    questions.map((q, i) => ({ id: `result-${i}`, pairKey: i, answer: q.answer }))
  );
  return {
    calcTiles,
    resultTiles,
    matchedCalcIds: new Set(),
    matchedResultIds: new Set(),
    attemptedCalcIds: new Set(),
  };
}
```

Every géométrie question has the exact same `prompt` string ("Combien de côtés a cette forme ?"), so without the shape, a pairs board with multiple géométrie tiles would be visually indistinguishable — the calc tiles need to carry `shape` so `ui.js` (a later task) can render the actual shape instead of the generic prompt text.

- [ ] **Step 1: Write the failing test**

In `tests/child/pairsGame.test.js`, find:

```js
  it('gives each calc tile the prompt and type of its source question', () => {
    const round = createPairsRound(sampleQuestions);
    const additionTile = round.calcTiles.find((t) => t.prompt === '2 + 3');
    expect(additionTile.type).toBe('addition');
    expect(additionTile.answer).toBe(5);
  });
```

Add this new test right after it, still inside `describe('createPairsRound', ...)`:

```js

  it('carries the shape field on a geometrie calc tile', () => {
    const geometryQuestions = [
      { type: 'geometrie', shape: 'triangle', answer: 3, prompt: 'Combien de côtés a cette forme ?' },
      { type: 'geometrie', shape: 'carre', answer: 4, prompt: 'Combien de côtés a cette forme ?' },
    ];
    const round = createPairsRound(geometryQuestions);
    const triangleTile = round.calcTiles.find((t) => t.shape === 'triangle');
    expect(triangleTile).toBeDefined();
    expect(triangleTile.answer).toBe(3);
    const carreTile = round.calcTiles.find((t) => t.shape === 'carre');
    expect(carreTile).toBeDefined();
    expect(carreTile.answer).toBe(4);
  });

  it('leaves shape undefined for non-geometrie calc tiles', () => {
    const round = createPairsRound(sampleQuestions);
    round.calcTiles.forEach((t) => expect(t.shape).toBeUndefined());
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/pairsGame.test.js`
Expected: FAIL — calc tiles have no `shape` field, so `round.calcTiles.find((t) => t.shape === 'triangle')` finds nothing.

- [ ] **Step 3: Write the implementation**

In `src/child/pairsGame.js`, find:

```js
  const calcTiles = shuffle(
    questions.map((q, i) => ({ id: `calc-${i}`, pairKey: i, type: q.type, prompt: q.prompt, answer: q.answer }))
  );
```

Replace with:

```js
  const calcTiles = shuffle(
    questions.map((q, i) => ({ id: `calc-${i}`, pairKey: i, type: q.type, prompt: q.prompt, shape: q.shape, answer: q.answer }))
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/pairsGame.test.js`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/pairsGame.js tests/child/pairsGame.test.js
git commit -m "feat: carry shape field on pairs calc tiles (TDD)"
```

---

### Task 9: CSS for shape display

**Files:**
- Modify: `src/child/style.css`

The current end of `src/child/style.css` is:

```css
.help-steps {
  padding-left: 20px;
  margin: 8px 0 16px;
}

.help-steps li {
  margin-bottom: 6px;
}
```

- [ ] **Step 1: Append to the end of `src/child/style.css`**

```css

.shape-display {
  width: 120px;
  height: 120px;
  margin: 12px auto;
}

.shape-display svg {
  width: 100%;
  height: 100%;
}

.pairs-tile .shape-display {
  width: 48px;
  height: 48px;
  margin: 0 auto;
}
```

`.shape-display` sizes the shape for the full-screen quiz/QCM question view (120px). `.pairs-tile .shape-display` overrides the size to fit inside a small pairs-board tile button (48px) — the same `.shape-display` class is reused in both contexts, just scaled down when nested inside `.pairs-tile`.

- [ ] **Step 2: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add styles for the geometry shape display"
```

---

### Task 10: Render the shape in question, QCM, and pairs screens

**Files:**
- Modify: `src/child/ui.js`

The current content of `src/child/ui.js` is:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { dynamicHintSteps } from './hints.js';

export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions d'Ambre</h1>
      <p>Un parent doit entrer le code d'appairage et le code secret.</p>
      <form id="pairing-form">
        <label>Code d'appairage<input id="family-id" type="text" autocomplete="off" required /></label>
        <label>Code secret (4 chiffres)<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        ${error ? '<p class="error" id="pairing-error"></p>' : ''}
        <button type="submit" class="big-button">Valider</button>
      </form>
    </div>
  `;
  if (error) {
    root.querySelector('#pairing-error').textContent = error;
  }
  root.querySelector('#pairing-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const familyId = root.querySelector('#family-id').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    onSubmit({ familyId, pin });
  });
}

const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
};

export function renderHome(root, { childName, avatarLevel, badges, auraClass, characterEmoji, accessoryEmoji, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar-wrapper">
        <div class="avatar ${auraClass}">${characterEmoji}</div>
        ${accessoryEmoji ? `<span class="avatar-accessory">${accessoryEmoji}</span>` : ''}
      </div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      ${focusType ? `<p class="focus-banner">${emojiForType(focusType)} Aujourd'hui, on s'entraîne sur ${FOCUS_LABELS[focusType]} !</p>` : ''}
      ${renderBadgeMedallionsHtml(badges)}
      <button id="customize" class="big-button">🎨 Personnaliser</button>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Ambre';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
}

function customizeMedallionHtml(item, selectedId) {
  if (!item.unlocked) {
    return `<div class="badge-medallion locked" title="${item.emoji}">🔒</div>`;
  }
  const isSelected = item.id === selectedId;
  return `<button class="badge-medallion selectable ${isSelected ? 'selected' : ''}" data-id="${item.id}">${item.emoji}</button>`;
}

export function renderCustomize(root, { characters, accessories, selectedCharacterId, selectedAccessoryId, onSelectCharacter, onSelectAccessory, onBack }) {
  root.innerHTML = `
    <div class="screen customize-screen">
      <h1>🎨 Personnaliser</h1>
      <p class="customize-section-title">Personnage</p>
      <div class="badges-row" id="character-options">
        ${characters.map((c) => customizeMedallionHtml(c, selectedCharacterId)).join('')}
      </div>
      <p class="customize-section-title">Accessoire</p>
      <div class="badges-row" id="accessory-options">
        ${accessories.map((a) => customizeMedallionHtml(a, selectedAccessoryId)).join('')}
      </div>
      <button id="customize-back" class="big-button">Retour</button>
    </div>
  `;
  root.querySelectorAll('#character-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCharacter(btn.dataset.id))
  );
  root.querySelectorAll('#accessory-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectAccessory(btn.dataset.id))
  );
  root.querySelector('#customize-back').addEventListener('click', onBack);
}

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

export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const isComparison = question.type === 'comparaison' || question.type === 'fraction';
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      ${isComparison
        ? `<div class="options">
            <button class="big-button answer-btn" data-value=">">supérieur &gt;</button>
            <button class="big-button answer-btn" data-value="<">inférieur &lt;</button>
          </div>`
        : `<form id="answer-form">
            <input id="answer-input" type="number" inputmode="numeric" required />
            <button type="submit" class="big-button">Valider</button>
          </form>`}
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (isComparison) {
    root.querySelectorAll('.answer-btn').forEach((btn) =>
      btn.addEventListener('click', () => onAnswer(btn.dataset.value))
    );
  } else {
    root.querySelector('#answer-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = Number(root.querySelector('#answer-input').value);
      onAnswer(value);
    });
  }
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      <div class="options">
        ${choices
          .map((choice) => {
            const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
            return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
          })
          .join('')}
      </div>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch, showHelp, onOpenHelp, onCloseHelp }) {
  let selectedCalcId = null;

  function draw() {
    const remainingCalc = round.calcTiles.filter((t) => !round.matchedCalcIds.has(t.id));
    const remainingResult = round.resultTiles.filter((t) => !round.matchedResultIds.has(t.id));
    root.innerHTML = `
      <div class="screen mission-screen pairs-screen">
        <button id="help-button" class="help-button" aria-label="Aide">❓</button>
        <div class="progress">${round.matchedCalcIds.size} / ${round.calcTiles.length} paires trouvées</div>
        ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
        ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
        <div class="pairs-grid">
          <div class="pairs-column">
            ${remainingCalc
              .map(
                (t) =>
                  `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${t.prompt}</button>`
              )
              .join('')}
          </div>
          <div class="pairs-column">
            ${remainingResult
              .map((t) => `<button class="pairs-tile result-tile" data-id="${t.id}">${t.answer}</button>`)
              .join('')}
          </div>
        </div>
        ${showHelp ? helpOverlayHtml(null) : ''}
      </div>
    `;
    root.querySelectorAll('.calc-tile').forEach((btn) =>
      btn.addEventListener('click', () => {
        selectedCalcId = btn.dataset.id;
        draw();
      })
    );
    root.querySelectorAll('.result-tile').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (!selectedCalcId) return;
        const calcId = selectedCalcId;
        selectedCalcId = null;
        onMatch(calcId, btn.dataset.id);
      })
    );
    root.querySelector('#help-button').addEventListener('click', onOpenHelp);
    if (showHelp) {
      root.querySelector('#help-close').addEventListener('click', onCloseHelp);
    }
  }

  draw();
}
```

`renderResults` and `renderConnectionError` (below `renderPairsRound` in the file) are unaffected by this task — not shown here, do not touch them.

- [ ] **Step 1: Add the `shapeSvg` import**

Replace:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { dynamicHintSteps } from './hints.js';
```

with:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { dynamicHintSteps } from './hints.js';
import { shapeSvg } from './shapes.js';
```

- [ ] **Step 2: Add `geometrie` to `FOCUS_LABELS`**

Replace:

```js
const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
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
};
```

- [ ] **Step 3: Show the shape in `renderQuestion`**

Replace:

```js
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      ${isComparison
        ? `<div class="options">
            <button class="big-button answer-btn" data-value=">">supérieur &gt;</button>
            <button class="big-button answer-btn" data-value="<">inférieur &lt;</button>
          </div>`
        : `<form id="answer-form">
            <input id="answer-input" type="number" inputmode="numeric" required />
            <button type="submit" class="big-button">Valider</button>
          </form>`}
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (isComparison) {
    root.querySelectorAll('.answer-btn').forEach((btn) =>
      btn.addEventListener('click', () => onAnswer(btn.dataset.value))
    );
  } else {
    root.querySelector('#answer-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = Number(root.querySelector('#answer-input').value);
      onAnswer(value);
    });
  }
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
```

with:

```js
      <h2>${question.prompt}</h2>
      ${question.shape ? `<div class="shape-display">${shapeSvg(question.shape)}</div>` : ''}
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      ${isComparison
        ? `<div class="options">
            <button class="big-button answer-btn" data-value=">">supérieur &gt;</button>
            <button class="big-button answer-btn" data-value="<">inférieur &lt;</button>
          </div>`
        : `<form id="answer-form">
            <input id="answer-input" type="number" inputmode="numeric" required />
            <button type="submit" class="big-button">Valider</button>
          </form>`}
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (isComparison) {
    root.querySelectorAll('.answer-btn').forEach((btn) =>
      btn.addEventListener('click', () => onAnswer(btn.dataset.value))
    );
  } else {
    root.querySelector('#answer-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = Number(root.querySelector('#answer-input').value);
      onAnswer(value);
    });
  }
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
```

- [ ] **Step 4: Show the shape in `renderQuestionQcm`**

Replace:

```js
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      <div class="options">
        ${choices
          .map((choice) => {
            const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
            return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
          })
          .join('')}
      </div>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch, showHelp, onOpenHelp, onCloseHelp }) {
```

with:

```js
      <h2>${question.prompt}</h2>
      ${question.shape ? `<div class="shape-display">${shapeSvg(question.shape)}</div>` : ''}
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      <div class="options">
        ${choices
          .map((choice) => {
            const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
            return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
          })
          .join('')}
      </div>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch, showHelp, onOpenHelp, onCloseHelp }) {
```

- [ ] **Step 5: Show the shape (instead of the generic prompt) on géométrie pairs calc tiles**

Replace:

```js
        <div class="pairs-grid">
          <div class="pairs-column">
            ${remainingCalc
              .map(
                (t) =>
                  `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${t.prompt}</button>`
              )
              .join('')}
          </div>
```

with:

```js
        <div class="pairs-grid">
          <div class="pairs-column">
            ${remainingCalc
              .map(
                (t) =>
                  `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${t.shape ? `<div class="shape-display">${shapeSvg(t.shape)}</div>` : t.prompt}</button>`
              )
              .join('')}
          </div>
```

`renderResults` and `renderConnectionError` remain untouched.

- [ ] **Step 6: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass — this task adds no new tests (`ui.js`'s rendering functions aren't unit-tested in this project). Test count should match whatever it was after Task 8.

- [ ] **Step 7: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render the geometry shape in question, QCM, and pairs screens"
```

---

### Task 11: Add géométrie to the parent focus-selector

**Files:**
- Modify: `src/parent/dashboard.js`

- [ ] **Step 1: Update `NOTION_TYPES`**

In `src/parent/dashboard.js`, find:

```js
const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
```

Replace with:

```js
const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie'];
```

Nothing else in the file changes — the `<select>` options are already generated dynamically from this array via `.map(...)`.

- [ ] **Step 2: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass — `tests/parent/dashboard.test.js` doesn't test `NOTION_TYPES`/the focus-selector rendering directly (consistent with the rest of the project not unit-testing HTML rendering), so no test changes are needed here.

- [ ] **Step 3: Commit**

```bash
git add src/parent/dashboard.js
git commit -m "feat: add geometrie to the parent focus-selector"
```

---

### Task 12: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing).

- [ ] **Step 3: Verify géométrie in classic quiz mode**

Play until a géométrie question comes up (or replay until it does — types are shuffled). Confirm a colored shape (triangle, carré, cercle, etc. depending on the family's current difficulty level for this notion) is displayed, the numeric answer input works, and submitting the correct side count is marked correct.

- [ ] **Step 4: Verify géométrie in QCM mode**

Same check as Step 3, but for the QCM format — confirm the shape displays and the multiple-choice buttons show plausible side-count options.

- [ ] **Step 5: Verify géométrie in pairs mode**

Confirm géométrie calc tiles show the actual shape (not repeated identical text), and that they can be correctly matched to their numeric result tile.

- [ ] **Step 6: Verify the help overlay for géométrie**

Tap "❓" on a géométrie question — confirm the generic help text appears, with no dynamic step-by-step list (unlike addition/soustraction/multiplication/division).

- [ ] **Step 7: Verify the parent dashboard**

Open `http://localhost:5173/parent.html`, sign in, and confirm: "Géométrie" appears as an option in the "Priorité de révision" selector; after playing at least one géométrie question, it appears in "Réussite par notion" and the weekly heat-map with the 📐 emoji.

- [ ] **Step 8: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-7 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
