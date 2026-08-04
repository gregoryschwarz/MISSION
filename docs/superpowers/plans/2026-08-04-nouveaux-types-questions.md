# Nouveaux types de questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new question types — division (exact, reusing multiplication's table tiers) and fraction (same-denominator comparison, reusing the existing 2-button `>`/`<` interaction) — fully integrated with adaptive difficulty, all 3 mission formats, and mastery badges.

**Architecture:** Both new generators live in `src/child/questions.js` alongside the existing 4, following the exact same `(level) => { type, a, b, answer, prompt }` shape. Every other system that touches question types (`difficulty.js`, `session.js`, `choices.js`, `ui.js`, `badges.js`, `progression.js`) is either already generic over `breakdown`/`type` keys (no change needed) or needs one small, mechanical addition (a new default, a new badge, an extra type in a list).

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Division and fraction question generators (TDD)

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

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
};

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison'];
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

**Important correction to the approved spec:** the spec's fraction denominators for palier 1 were `{2, 4}`. A denominator of 2 only has one valid proper-fraction numerator (`1/2` — the only integer strictly between 0 and 2 is 1), so it's mathematically impossible to generate two *different* proper fractions sharing denominator 2, which the spec also requires ("numérateurs toujours différents"). This plan replaces `2` with `3` in every tier (denominator 3 has two valid numerators, 1 and 2, so it works): `{1: [3, 4], 2: [3, 4, 6], 3: [3, 4, 6, 8, 10]}`. Same item count per tier as originally approved, same "simple, small, growing" progression — just swapping the one denominator that couldn't actually work.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/child/questions.test.js` with:

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

function digitsReversed(n) {
  return String(n).split('').map(Number).reverse();
}

describe('generateAddition', () => {
  it('returns a correct sum under 100 at level 1 (default)', () => {
    const q = generateAddition();
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(100);
  });

  it('returns a correct sum under 200 at level 2', () => {
    const q = generateAddition(2);
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(200);
  });

  it('returns a correct sum under 999 at level 3', () => {
    const q = generateAddition(3);
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(999);
  });
});

describe('generateSubtraction', () => {
  it('returns a correct, positive difference under 100 with no borrowing at level 1', () => {
    const q = generateSubtraction();
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeLessThan(100);
    const aDigits = digitsReversed(q.a);
    digitsReversed(q.b).forEach((d, i) => expect(d).toBeLessThanOrEqual(aDigits[i] ?? 0));
  });

  it('returns a correct, positive difference under 200 with no borrowing at level 2', () => {
    const q = generateSubtraction(2);
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeLessThan(200);
    const aDigits = digitsReversed(q.a);
    digitsReversed(q.b).forEach((d, i) => expect(d).toBeLessThanOrEqual(aDigits[i] ?? 0));
  });

  it('allows borrowing with numbers between 100 and 999 at level 3', () => {
    const q = generateSubtraction(3);
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeGreaterThanOrEqual(100);
    expect(q.a).toBeLessThan(999);
  });

  it('never produces a trivial b === a (answer of 0), even across many draws', () => {
    for (let i = 0; i < 500; i++) {
      const q = generateSubtraction();
      expect(q.b).not.toBe(q.a);
      expect(q.answer).toBeGreaterThan(0);
    }
  });
});

describe('generateMultiplication', () => {
  it('uses the table 2, 5, or 10 at level 1 (default)', () => {
    const q = generateMultiplication();
    expect([2, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });

  it('adds tables 3 and 4 at level 2', () => {
    const q = generateMultiplication(2);
    expect([2, 3, 4, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });

  it('uses any table from 2 to 10 at level 3', () => {
    const q = generateMultiplication(3);
    expect(q.a).toBeGreaterThanOrEqual(2);
    expect(q.a).toBeLessThanOrEqual(10);
    expect(q.answer).toBe(q.a * q.b);
  });
});

describe('generateComparison', () => {
  it('picks the correct comparison symbol under 100 at level 1 (default)', () => {
    const q = generateComparison();
    expect(q.a).not.toBe(q.b);
    expect(q.a).toBeLessThan(100);
    expect(q.b).toBeLessThan(100);
    if (q.a > q.b) expect(q.answer).toBe('>');
    else expect(q.answer).toBe('<');
  });

  it('uses numbers under 500 at level 2', () => {
    const q = generateComparison(2);
    expect(q.a).toBeLessThan(500);
    expect(q.b).toBeLessThan(500);
  });

  it('uses numbers under 999 at level 3', () => {
    const q = generateComparison(3);
    expect(q.a).toBeLessThan(999);
    expect(q.b).toBeLessThan(999);
  });
});

describe('generateDivision', () => {
  it('is always an exact division at level 1 (default), using tables 2/5/10', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision();
      expect(q.type).toBe('division');
      expect(q.answer * q.b).toBe(q.a);
      expect([2, 5, 10]).toContain(q.b);
    }
  });

  it('adds tables 3 and 4 at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision(2);
      expect(q.answer * q.b).toBe(q.a);
      expect([2, 3, 4, 5, 10]).toContain(q.b);
    }
  });

  it('uses any table from 2 to 10 at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision(3);
      expect(q.answer * q.b).toBe(q.a);
      expect(q.b).toBeGreaterThanOrEqual(2);
      expect(q.b).toBeLessThanOrEqual(10);
    }
  });
});

describe('generateFraction', () => {
  it('uses denominator 3 or 4 at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction();
      expect(q.type).toBe('fraction');
      expect([3, 4]).toContain(q.a.denominator);
      expect(q.a.denominator).toBe(q.b.denominator);
      expect(q.a.numerator).not.toBe(q.b.numerator);
      expect(q.a.numerator).toBeLessThan(q.a.denominator);
      expect(q.b.numerator).toBeLessThan(q.b.denominator);
      const expectedAnswer = q.a.numerator > q.b.numerator ? '>' : '<';
      expect(q.answer).toBe(expectedAnswer);
      expect(q.options).toEqual(['>', '<']);
    }
  });

  it('adds denominator 6 at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction(2);
      expect([3, 4, 6]).toContain(q.a.denominator);
    }
  });

  it('uses denominators up to 10 at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction(3);
      expect([3, 4, 6, 8, 10]).toContain(q.a.denominator);
    }
  });
});

describe('generateMission', () => {
  it('generates the requested number of questions', () => {
    expect(generateMission(10)).toHaveLength(10);
  });

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

  it("passes each type's difficulty level through to its generator", () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateMission(6, {
        addition: 1,
        soustraction: 1,
        multiplication: 3,
        comparaison: 1,
        division: 1,
        fraction: 1,
      });
      const multiplication = mission.find((q) => q.type === 'multiplication');
      tablesSeen.push(multiplication.a);
    }
    // Level 3 multiplication can use tables 3, 4, 6, 7, 8, 9 — none of which level 1 ever produces (level 1 is limited to 2, 5, 10).
    // Over 50 draws, the chance of never seeing one of these is astronomically small, so this reliably proves the level was passed through.
    expect(tablesSeen.some((table) => [3, 4, 6, 7, 8, 9].includes(table))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/questions.test.js`
Expected: FAIL — `generateDivision`/`generateFraction` are not exported, `generateMission`'s type-coverage tests fail against the current 4-type list.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/child/questions.js` with:

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

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/questions.test.js`
Expected: PASS (23 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add division and fraction question generators"
```

---

### Task 2: Default difficulty levels for the new types (TDD)

**Files:**
- Modify: `src/shared/difficulty.js`
- Modify: `tests/shared/difficulty.test.js`

The current content of `src/shared/difficulty.js` is:

```js
const MIN_LEVEL = 1;
const MAX_LEVEL = 3;
const LEVEL_UP_THRESHOLD = 0.8;
const LEVEL_DOWN_THRESHOLD = 0.5;

export const DEFAULT_DIFFICULTY_LEVELS = {
  addition: 1,
  soustraction: 1,
  multiplication: 1,
  comparaison: 1,
};

export const DIFFICULTY_LABELS = {
  1: 'Début',
  2: 'Confirmé',
  3: 'Avancé',
};

export function adjustDifficultyLevels(currentLevels, breakdown) {
  const nextLevels = { ...currentLevels };
  Object.entries(breakdown).forEach(([type, { correct, total }]) => {
    if (total === 0) return;
    const ratio = correct / total;
    const level = currentLevels[type] ?? MIN_LEVEL;
    if (ratio >= LEVEL_UP_THRESHOLD && level < MAX_LEVEL) {
      nextLevels[type] = level + 1;
    } else if (ratio < LEVEL_DOWN_THRESHOLD && level > MIN_LEVEL) {
      nextLevels[type] = level - 1;
    }
  });
  return nextLevels;
}
```

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/shared/difficulty.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from '../../src/shared/difficulty.js';

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

describe('DIFFICULTY_LABELS', () => {
  it('provides French labels for all 3 levels', () => {
    expect(DIFFICULTY_LABELS).toEqual({ 1: 'Début', 2: 'Confirmé', 3: 'Avancé' });
  });
});

describe('adjustDifficultyLevels', () => {
  it('levels up a type when accuracy is 80% or higher', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1 },
      { addition: { correct: 4, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('levels down a type when accuracy is below 50%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1 },
      { addition: { correct: 2, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('keeps the level unchanged between 50% and 80%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1 },
      { addition: { correct: 3, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('never goes above level 3', () => {
    const result = adjustDifficultyLevels(
      { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.addition).toBe(3);
  });

  it('never goes below level 1', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1 },
      { addition: { correct: 0, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('leaves types absent from the breakdown unchanged', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 2, multiplication: 1, comparaison: 3, division: 1, fraction: 1 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.soustraction).toBe(2);
    expect(result.multiplication).toBe(1);
    expect(result.comparaison).toBe(3);
  });

  it('adjusts division and fraction the same way as the original 4 types', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 2 },
      { division: { correct: 5, total: 5 }, fraction: { correct: 1, total: 5 } }
    );
    expect(result.division).toBe(2);
    expect(result.fraction).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: FAIL — `DEFAULT_DIFFICULTY_LEVELS` is missing `division`/`fraction`.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/shared/difficulty.js` with:

```js
const MIN_LEVEL = 1;
const MAX_LEVEL = 3;
const LEVEL_UP_THRESHOLD = 0.8;
const LEVEL_DOWN_THRESHOLD = 0.5;

export const DEFAULT_DIFFICULTY_LEVELS = {
  addition: 1,
  soustraction: 1,
  multiplication: 1,
  comparaison: 1,
  division: 1,
  fraction: 1,
};

export const DIFFICULTY_LABELS = {
  1: 'Début',
  2: 'Confirmé',
  3: 'Avancé',
};

export function adjustDifficultyLevels(currentLevels, breakdown) {
  const nextLevels = { ...currentLevels };
  Object.entries(breakdown).forEach(([type, { correct, total }]) => {
    if (total === 0) return;
    const ratio = correct / total;
    const level = currentLevels[type] ?? MIN_LEVEL;
    if (ratio >= LEVEL_UP_THRESHOLD && level < MAX_LEVEL) {
      nextLevels[type] = level + 1;
    } else if (ratio < LEVEL_DOWN_THRESHOLD && level > MIN_LEVEL) {
      nextLevels[type] = level - 1;
    }
  });
  return nextLevels;
}
```

Note: `adjustDifficultyLevels` itself is byte-for-byte unchanged — it already iterates generically over whatever keys `breakdown` contains, so it works for `division`/`fraction` with zero code changes. Only the `DEFAULT_DIFFICULTY_LEVELS` constant gains the 2 new keys.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/difficulty.js tests/shared/difficulty.test.js
git commit -m "feat: add division and fraction to default difficulty levels"
```

---

### Task 3: Session breakdown entries for the new types (TDD)

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

Without this change, `recordAnswer` would throw when a `division`/`fraction` question is answered: `session.breakdown['division']` would be `undefined`, and `breakdown.total += 1` would throw `Cannot set properties of undefined`. This task is load-bearing, not cosmetic.

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('session flow', ...)` block in `tests/child/session.test.js` (read the current file first — it has 4 tests in that block plus a `describe('recordAnswer', ...)` block; add the new test as a 5th test in `session flow`, changing nothing else):

```js
  it('initializes breakdown entries for division and fraction', () => {
    const session = createSession([]);
    expect(session.breakdown.division).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.fraction).toEqual({ correct: 0, total: 0 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/session.test.js`
Expected: FAIL — `session.breakdown.division` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `src/child/session.js`, replace:

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
    },
    startedAt: Date.now(),
  };
}
```

with:

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
```

`currentQuestion`, `isSessionComplete`, `recordAnswer`, `submitAnswer`, and `finishSession` are unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/session.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: initialize session breakdown for division and fraction"
```

---

### Task 4: QCM choices for division and fraction (TDD)

**Files:**
- Modify: `src/child/choices.js`
- Modify: `tests/child/choices.test.js`

The current content of `src/child/choices.js` is:

```js
import { randomInt, shuffle } from './random.js';

export function generateChoices(question) {
  if (question.type === 'comparaison') {
    return ['>', '<'];
  }
  const correct = question.answer;
  const distractors = new Set();
  while (distractors.size < 2) {
    const magnitude = randomInt(1, 5);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const candidate = correct + magnitude * sign;
    if (candidate >= 0 && candidate !== correct && !distractors.has(candidate)) {
      distractors.add(candidate);
    }
  }
  return shuffle([correct, ...distractors]);
}
```

- [ ] **Step 1: Write the failing test**

Add these two tests inside the existing `describe('generateChoices', ...)` block in `tests/child/choices.test.js` (read the current file first — it has 5 tests; add these as tests 6 and 7, changing nothing else):

```js
  it('returns exactly [">", "<"] for fraction questions', () => {
    const question = {
      type: 'fraction',
      a: { numerator: 1, denominator: 4 },
      b: { numerator: 3, denominator: 4 },
      answer: '<',
      prompt: '1/4 ___ 3/4',
      options: ['>', '<'],
    };
    expect(generateChoices(question)).toEqual(['>', '<']);
  });

  it('includes the correct answer among 3 distinct, non-negative choices for division', () => {
    const question = { type: 'division', a: 20, b: 4, answer: 5, prompt: '20 ÷ 4' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(5);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/choices.test.js`
Expected: FAIL — the fraction question falls through to the numeric-distractor path instead of returning `['>', '<']`.

- [ ] **Step 3: Write minimal implementation**

In `src/child/choices.js`, replace:

```js
export function generateChoices(question) {
  if (question.type === 'comparaison') {
    return ['>', '<'];
  }
```

with:

```js
export function generateChoices(question) {
  if (question.type === 'comparaison' || question.type === 'fraction') {
    return ['>', '<'];
  }
```

The rest of the function is unchanged — `division`'s numeric answer already flows through the same generic distractor logic as `addition`/`soustraction`/`multiplication`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/choices.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/choices.js tests/child/choices.test.js
git commit -m "feat: support division and fraction in QCM choice generation"
```

---

### Task 5: Fraction display in the classic quiz format

**Files:**
- Modify: `src/child/ui.js`

The relevant current content of `src/child/ui.js` (`renderQuestion`):

```js
export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder }) {
  const isComparison = question.type === 'comparaison';
```

- [ ] **Step 1: Extend the comparison check**

Replace:

```js
  const isComparison = question.type === 'comparaison';
```

with:

```js
  const isComparison = question.type === 'comparaison' || question.type === 'fraction';
```

This is the only change in the file. `renderQuestionQcm` and `renderPairsRound` already work generically on `question.type`/`prompt`/`answer`/`choices` and need no changes — a fraction question's `generateChoices` result (`['>', '<']`) renders through the exact same button loop QCM already uses for any 2-or-3-choice question, and the pairs format just displays `prompt`/`answer` as tile text regardless of type.

No test changes for this task — consistent with the rest of the project, which doesn't unit-test HTML rendering functions (verified manually in the final task).

- [ ] **Step 2: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: display fraction comparison questions with the 2-button interface"
```

---

### Task 6: Mastery badges for division and fraction (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Modify: `tests/shared/badges.test.js`

The current content of `src/shared/badges.js` is:

```js
export const BADGES = [
  { id: 'streak-3', category: 'streak', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', category: 'streak', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', category: 'streak', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
  { id: 'mastery-addition', category: 'maitrise', emoji: '➕', label: 'Addition maîtrisée', gradient: ['#a8e6cf', '#dcedc1'] },
  { id: 'mastery-soustraction', category: 'maitrise', emoji: '➖', label: 'Soustraction maîtrisée', gradient: ['#ffaaa5', '#ffd3b6'] },
  { id: 'mastery-multiplication', category: 'maitrise', emoji: '✖️', label: 'Multiplication maîtrisée', gradient: ['#a2d2ff', '#bde0fe'] },
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
  { id: 'perfect-10', category: 'parfait', emoji: '🌈', label: '10 missions parfaites', gradient: ['#ff9a8b', '#ff6a88'] },
  { id: 'perfect-50', category: 'parfait', emoji: '💎', label: '50 missions parfaites', gradient: ['#84fab0', '#8fd3f4'] },
];

export const BADGE_CATEGORIES = [
  { id: 'streak', label: 'Série' },
  { id: 'maitrise', label: 'Maîtrise' },
  { id: 'parfait', label: 'Missions parfaites' },
];

export function badgeMedallionData(earnedBadgeIds) {
  return BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
  }));
}

function medallionHtml(badge) {
  if (badge.earned) {
    return `<div class="badge-medallion earned" style="background: linear-gradient(135deg, ${badge.gradient[0]}, ${badge.gradient[1]})" title="${badge.label}">${badge.emoji}</div>`;
  }
  return `<div class="badge-medallion locked" title="${badge.label}">🔒</div>`;
}

export function renderBadgeMedallionsHtml(earnedBadgeIds) {
  const data = badgeMedallionData(earnedBadgeIds);
  return BADGE_CATEGORIES.map((category) => {
    const badgesInCategory = data.filter((b) => b.category === category.id);
    return `
      <div class="badge-category">
        <h3 class="badge-category-title">${category.label}</h3>
        <div class="badges-row">${badgesInCategory.map(medallionHtml).join('')}</div>
      </div>
    `;
  }).join('');
}
```

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/shared/badges.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: FAIL — `BADGES` only has 10 entries.

- [ ] **Step 3: Write minimal implementation**

In `src/shared/badges.js`, replace:

```js
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
```

with:

```js
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'mastery-division', category: 'maitrise', emoji: '➗', label: 'Division maîtrisée', gradient: ['#ffe5a0', '#ffcb77'] },
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Fractions maîtrisées', gradient: ['#ffb4a2', '#ffcdb2'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
```

`BADGE_CATEGORIES`, `badgeMedallionData`, `medallionHtml`, and `renderBadgeMedallionsHtml` are unchanged — they already work generically over however many entries `BADGES` contains.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add mastery badges for division and fraction"
```

---

### Task 7: Mastery detection for the new types (TDD)

**Files:**
- Modify: `src/shared/progression.js`
- Modify: `tests/shared/progression.test.js`

The relevant current content of `src/shared/progression.js`:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison'];
```

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('newlyMasteredTypes', ...)` block in `tests/shared/progression.test.js` (read the current file first — it has 3 tests in that block; add this as a 4th test, changing nothing else):

```js
  it('detects mastery for the new division and fraction types too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 2, fraction: 1 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 3, fraction: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['division']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: FAIL — `division` is not in `OPERATION_TYPES`, so `newlyMasteredTypes` never checks it and returns `[]`.

- [ ] **Step 3: Write minimal implementation**

In `src/shared/progression.js`, replace:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison'];
```

with:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
```

Everything else in the file is unchanged — `newlyMasteredTypes`, `applyProgression`, and every other function already work generically over `OPERATION_TYPES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: PASS (20 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: detect mastery for division and fraction types"
```

---

### Task 8: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, no failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing) and the parent dashboard (`http://localhost:5173/parent.html`, already logged in).

- [ ] **Step 4: Verify division and fraction appear in missions**

Play a few missions across all 3 formats (quiz classique, QCM éclair, chasse aux paires — replay until you've seen each format, per the mission-mode alternation from the variété de mini-jeux feature). Confirm:
- Division questions render as `dividend ÷ divisor` with a typed numeric answer (quiz) or numeric buttons (QCM), and as a normal tile in the pairs format.
- Fraction questions render as `num/den ___ num/den` with the 2-button `>`/`<` interface (quiz and QCM), and as a tile showing the fraction prompt with a `>`/`<` result tile in the pairs format.

- [ ] **Step 5: Verify the parent dashboard shows the 2 new notions**

Confirm "Réussite par notion" on the parent dashboard now includes `division` and `fraction` rows once at least one mission has included them, each showing a percentage and a difficulty tier label (Début/Confirmé/Avancé).

- [ ] **Step 6: Verify mastery badges for the new types**

Play missions on division or fraction, performing well (≥80%) until that type's difficulty tier reaches "Avancé". Confirm the corresponding new medallion ("Division maîtrisée" ➗ or "Fractions maîtrisées" 🍕) unlocks in the "Maîtrise" row, which now shows 6 medallions instead of 4.

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 4-6 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
