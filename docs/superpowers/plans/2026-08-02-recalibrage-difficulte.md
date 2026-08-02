# Recalibrage Difficulté Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the numeric difficulty of the four math question generators to match a child just starting CE2 (French second grade): numbers under 100, no-borrow subtraction, and only the ×2/×5/×10 multiplication tables.

**Architecture:** Single-file change to the existing pure question-generation module (`src/child/questions.js`), following strict TDD — update the test expectations first, confirm they fail against the current (too-hard) implementation, then update the implementation to match.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Recalibrate question generators (TDD)

**Files:**
- Modify: `src/child/questions.js`
- Modify: `tests/child/questions.test.js`

The current content of `src/child/questions.js` is:

```js
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateAddition() {
  const a = randomInt(10, 500);
  const b = randomInt(10, 499);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

export function generateSubtraction() {
  const a = randomInt(50, 999);
  const b = randomInt(10, a - 1);
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

export function generateMultiplication() {
  const table = randomInt(2, 5);
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

export function generateComparison() {
  const a = randomInt(1, 999);
  let b = randomInt(1, 999);
  while (b === a) b = randomInt(1, 999);
  const answer = a > b ? '>' : '<';
  return { type: 'comparaison', a, b, answer, prompt: `${a} ___ ${b}`, options: ['>', '<'] };
}

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
};

export function generateMission(count = 10) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison'];
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    questions.push(GENERATORS[type]());
  }
  return shuffle(questions);
}
```

The current content of `tests/child/questions.test.js` is:

```js
import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateMission,
} from '../../src/child/questions.js';

describe('generateAddition', () => {
  it('returns a correct sum within CE2 bounds', () => {
    const q = generateAddition();
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThanOrEqual(999);
  });
});

describe('generateSubtraction', () => {
  it('returns a correct, non-negative difference', () => {
    const q = generateSubtraction();
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThanOrEqual(0);
  });
});

describe('generateMultiplication', () => {
  it('uses a table between 2 and 5', () => {
    const q = generateMultiplication();
    expect(q.a).toBeGreaterThanOrEqual(2);
    expect(q.a).toBeLessThanOrEqual(5);
    expect(q.answer).toBe(q.a * q.b);
  });
});

describe('generateComparison', () => {
  it('picks the correct comparison symbol', () => {
    const q = generateComparison();
    expect(q.a).not.toBe(q.b);
    if (q.a > q.b) expect(q.answer).toBe('>');
    else expect(q.answer).toBe('<');
  });
});

describe('generateMission', () => {
  it('generates the requested number of questions', () => {
    expect(generateMission(10)).toHaveLength(10);
  });

  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = ['addition', 'soustraction', 'multiplication', 'comparaison'];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });
});
```

- [ ] **Step 1: Replace the four recalibrated test blocks**

In `tests/child/questions.test.js`, replace the `generateAddition`, `generateSubtraction`, `generateMultiplication`, and `generateComparison` describe blocks (leave the imports and the `generateMission` describe block exactly as they are) with:

```js
describe('generateAddition', () => {
  it('returns a correct sum under 100', () => {
    const q = generateAddition();
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(100);
  });
});

describe('generateSubtraction', () => {
  it('returns a correct, non-negative difference with no borrowing', () => {
    const q = generateSubtraction();
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.a).toBeLessThan(100);
    const aUnits = q.a % 10;
    const aTens = Math.floor(q.a / 10);
    const bUnits = q.b % 10;
    const bTens = Math.floor(q.b / 10);
    expect(bUnits).toBeLessThanOrEqual(aUnits);
    expect(bTens).toBeLessThanOrEqual(aTens);
  });
});

describe('generateMultiplication', () => {
  it('uses the table 2, 5, or 10', () => {
    const q = generateMultiplication();
    expect([2, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });
});

describe('generateComparison', () => {
  it('picks the correct comparison symbol within bounds', () => {
    const q = generateComparison();
    expect(q.a).not.toBe(q.b);
    expect(q.a).toBeLessThan(100);
    expect(q.b).toBeLessThan(100);
    if (q.a > q.b) expect(q.answer).toBe('>');
    else expect(q.answer).toBe('<');
  });
});
```

- [ ] **Step 2: Run tests to verify the recalibrated ones fail**

Run: `npx vitest run tests/child/questions.test.js`
Expected: FAIL — the new `generateAddition` test fails because the current implementation can produce sums up to 999; the new `generateSubtraction` test fails because the current implementation allows borrowing; the new `generateMultiplication` test fails because the current implementation can produce a table of 3 or 4 (not in `[2, 5, 10]`); the new `generateComparison` test fails because the current implementation can produce numbers above 99. The `generateMission` tests still pass (unaffected).

- [ ] **Step 3: Replace the four recalibrated generator functions**

In `src/child/questions.js`, replace `generateAddition`, `generateSubtraction`, `generateMultiplication`, and `generateComparison` (leave `randomInt`, `shuffle`, `GENERATORS`, and `generateMission` exactly as they are) with:

```js
export function generateAddition() {
  const a = randomInt(10, 79);
  const b = randomInt(1, 99 - a);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

export function generateSubtraction() {
  const aUnits = randomInt(0, 9);
  const aTens = randomInt(1, 9);
  const a = aTens * 10 + aUnits;
  const bUnits = randomInt(0, aUnits);
  const bTens = randomInt(0, aTens);
  const b = bTens * 10 + bUnits;
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

const MULTIPLICATION_TABLES = [2, 5, 10];

export function generateMultiplication() {
  const table = MULTIPLICATION_TABLES[randomInt(0, MULTIPLICATION_TABLES.length - 1)];
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

export function generateComparison() {
  const a = randomInt(1, 99);
  let b = randomInt(1, 99);
  while (b === a) b = randomInt(1, 99);
  const answer = a > b ? '>' : '<';
  return { type: 'comparaison', a, b, answer, prompt: `${a} ___ ${b}`, options: ['>', '<'] };
}
```

Note: `MULTIPLICATION_TABLES` must be declared above `generateMultiplication` (after `shuffle`, before or after `generateAddition`/`generateSubtraction` — exact position among the other functions doesn't matter, just make sure it's declared before it's used and doesn't collide with the existing `GENERATORS` constant name).

- [ ] **Step 4: Run tests to verify everything passes**

Run: `npx vitest run tests/child/questions.test.js`
Expected: PASS (6 tests: 4 recalibrated + the 2 unchanged `generateMission` tests)

- [ ] **Step 5: Run the full project test suite**

Run: `npx vitest run`
Expected: PASS (44 tests across 9 files — this change only touches `questions.js`/`questions.test.js`, nothing else should be affected)

- [ ] **Step 6: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "fix: recalibrate question difficulty for start-of-CE2 level"
```

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. This change has no effect on Firestore data or security rules, so no rules deploy is needed.
