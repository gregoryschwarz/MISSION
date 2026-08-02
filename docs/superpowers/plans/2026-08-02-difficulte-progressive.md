# Difficulté Progressive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each math operation type (addition, subtraction, multiplication, comparison) its own 3-tier difficulty level (Début/Confirmé/Avancé) that automatically adjusts after every mission based on the child's accuracy on that type, and surface the current tier to the parent dashboard.

**Architecture:** A new pure, shared module (`src/shared/difficulty.js`) owns the tier labels, default levels, and the adjustment rule. `src/child/questions.js`'s generators are extended to accept a `level` parameter that selects the numeric range/table set for that tier. `src/child/main.js` reads the child's stored `difficultyLevels` when building a mission and writes the recalculated levels back to Firestore alongside the rest of the progression data it already saves. `src/parent/family.js` initializes new profiles with the default levels; `src/parent/dashboard.js` displays the current tier per notion.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Shared difficulty module (TDD)

**Files:**
- Create: `src/shared/difficulty.js`
- Test: `tests/shared/difficulty.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/difficulty.test.js`:

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
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 4, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('levels down a type when accuracy is below 50%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 2, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('keeps the level unchanged between 50% and 80%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 3, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('never goes above level 3', () => {
    const result = adjustDifficultyLevels(
      { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.addition).toBe(3);
  });

  it('never goes below level 1', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 0, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('leaves types absent from the breakdown unchanged', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 2, multiplication: 1, comparaison: 3 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.soustraction).toBe(2);
    expect(result.multiplication).toBe(1);
    expect(result.comparaison).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: FAIL — cannot find module `../../src/shared/difficulty.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/difficulty.js`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/difficulty.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/difficulty.js tests/shared/difficulty.test.js
git commit -m "feat: add shared difficulty tiers and adjustment rule"
```

---

### Task 2: Question generators support difficulty levels (TDD)

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
  const a = randomInt(10, 79);
  const b = randomInt(1, 99 - a);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

export function generateSubtraction() {
  const aUnits = randomInt(0, 9);
  const aTens = randomInt(1, 9);
  const a = aTens * 10 + aUnits;
  let bUnits = randomInt(0, aUnits);
  let bTens = randomInt(0, aTens);
  if (bUnits === 0 && bTens === 0) {
    if (aUnits > 0) {
      bUnits = randomInt(1, aUnits);
    } else {
      bTens = randomInt(1, aTens);
    }
  }
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

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/child/questions.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
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

describe('generateMission', () => {
  it('generates the requested number of questions', () => {
    expect(generateMission(10)).toHaveLength(10);
  });

  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = ['addition', 'soustraction', 'multiplication', 'comparaison'];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });

  it("passes each type's difficulty level through to its generator", () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateMission(4, { addition: 1, soustraction: 1, multiplication: 3, comparaison: 1 });
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
Expected: FAIL — the level-2/level-3 tests fail because the current generators don't accept a `level` argument at all (they ignore it and always behave like level 1); the `generateMission` level pass-through test fails for the same reason.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/child/questions.js` with:

```js
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

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

function noBorrowSubtrahend(a) {
  const digits = String(a).split('').map(Number);
  const bDigits = digits.map((d) => randomInt(0, d));
  if (bDigits.every((d) => d === 0)) {
    const bumpableIndex = digits.findIndex((d) => d > 0);
    if (bumpableIndex !== -1) {
      bDigits[bumpableIndex] = randomInt(1, digits[bumpableIndex]);
    }
  }
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
  const a = randomInt(10, maxValue - 1);
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

Note: `generateAddition`'s `maxSum - 20` lower bound for `a` assumes `maxSum >= 30` (true for all 3 tiers: 100, 200, 999) so `a` always has a valid range with room left for `b >= 1`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/questions.test.js`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add per-type difficulty levels to question generators"
```

---

### Task 3: Initialize new profiles with default difficulty levels

**Files:**
- Modify: `src/parent/family.js`

The current content of `src/parent/family.js` is:

```js
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { hashPin } from '../shared/pin.js';

export async function findFamilyByParent(parentUid) {
  const q = query(collection(db, 'families'), where('parentUid', '==', parentUid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const familyDoc = snapshot.docs[0];
  return { id: familyDoc.id, ...familyDoc.data() };
}

export async function createFamily({ parentUid, parentEmail, childName, pin }) {
  const familyRef = doc(collection(db, 'families'));
  await setDoc(familyRef, {
    parentUid,
    parentEmail,
    createdAt: serverTimestamp(),
  });
  const pinHash = await hashPin(pin);
  await setDoc(doc(db, 'families', familyRef.id, 'pairing', 'data'), {
    childName,
    pinHash,
  });
  await setDoc(doc(db, 'families', familyRef.id, 'profile', 'data'), {
    childName,
    xp: 0,
    avatarLevel: 1,
    badges: [],
    streakDays: 0,
    lastSessionDate: null,
  });
  return familyRef.id;
}

export async function fetchProfile(familyId) {
  const snapshot = await getDoc(doc(db, 'families', familyId, 'profile', 'data'));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function fetchSessions(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
```

- [ ] **Step 1: Add the import and the new profile field**

Replace the full contents of `src/parent/family.js` with:

```js
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { hashPin } from '../shared/pin.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

export async function findFamilyByParent(parentUid) {
  const q = query(collection(db, 'families'), where('parentUid', '==', parentUid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const familyDoc = snapshot.docs[0];
  return { id: familyDoc.id, ...familyDoc.data() };
}

export async function createFamily({ parentUid, parentEmail, childName, pin }) {
  const familyRef = doc(collection(db, 'families'));
  await setDoc(familyRef, {
    parentUid,
    parentEmail,
    createdAt: serverTimestamp(),
  });
  const pinHash = await hashPin(pin);
  await setDoc(doc(db, 'families', familyRef.id, 'pairing', 'data'), {
    childName,
    pinHash,
  });
  await setDoc(doc(db, 'families', familyRef.id, 'profile', 'data'), {
    childName,
    xp: 0,
    avatarLevel: 1,
    badges: [],
    streakDays: 0,
    lastSessionDate: null,
    difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
  });
  return familyRef.id;
}

export async function fetchProfile(familyId) {
  const snapshot = await getDoc(doc(db, 'families', familyId, 'profile', 'data'));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function fetchSessions(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
```

`findFamilyByParent`, `fetchProfile`, and `fetchSessions` are unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/parent/family.js
git commit -m "feat: initialize new family profiles with default difficulty levels"
```

---

### Task 4: Show difficulty tier on the parent dashboard

**Files:**
- Modify: `src/parent/dashboard.js`

The current content of `src/parent/dashboard.js` is:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';

export function aggregateBreakdown(sessions) {
  const totals = {};
  sessions.forEach((session) => {
    Object.entries(session.breakdown).forEach(([type, { correct, total }]) => {
      if (!totals[type]) totals[type] = { correct: 0, total: 0 };
      totals[type].correct += correct;
      totals[type].total += total;
    });
  });
  return Object.fromEntries(
    Object.entries(totals).map(([type, { correct, total }]) => [
      type,
      total === 0 ? 0 : Math.round((correct / total) * 100),
    ])
  );
}

export function renderDashboard(root, { family, profile, sessions, onSignOut }) {
  const breakdown = aggregateBreakdown(sessions);
  root.innerHTML = `
    <div class="dashboard">
      <header>
        <h1>Tableau de bord — <span id="child-name"></span></h1>
        <p>Code d'appairage à entrer sur la tablette : <strong>${family.id}</strong></p>
        <button id="sign-out">Se déconnecter</button>
      </header>
      <section class="progress-summary">
        <p>Niveau ${profile.avatarLevel} — ${profile.xp} XP</p>
        <p>Série actuelle : ${profile.streakDays} jour${profile.streakDays > 1 ? 's' : ''}</p>
        <div class="badges-row">${renderBadgeMedallionsHtml(profile.badges)}</div>
      </section>
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => `<li>${type} : ${percent}%</li>`)
            .join('')}
        </ul>
      </section>
      <section class="sessions">
        <h2>Sessions récentes</h2>
        <ul>
          ${sessions
            .map(
              (s) =>
                `<li>${s.date} — ${s.correctCount}/${s.questionsTotal} en ${Math.round(s.durationSeconds / 60)} min</li>`
            )
            .join('')}
        </ul>
      </section>
    </div>
  `;
  root.querySelector('#child-name').textContent = profile.childName;
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
}
```

- [ ] **Step 1: Add the import**

Add this as a second import line, right after the existing `renderBadgeMedallionsHtml` import:

```js
import { DIFFICULTY_LABELS, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
```

- [ ] **Step 2: Show the difficulty label in the breakdown section**

Replace:

```js
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => `<li>${type} : ${percent}%</li>`)
            .join('')}
        </ul>
      </section>
```

with:

```js
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => {
              const level = (profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS)[type] ?? 1;
              return `<li>${type} : ${percent}% — ${DIFFICULTY_LABELS[level]}</li>`;
            })
            .join('')}
        </ul>
      </section>
```

`aggregateBreakdown`, the `header`, `progress-summary`, and `sessions` sections are unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/parent/dashboard.js
git commit -m "feat: show current difficulty tier per notion on the parent dashboard"
```

---

### Task 5: Wire difficulty levels into child orchestration

**Files:**
- Modify: `src/child/main.js`

The current content of `src/child/main.js` is:

```js
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { getStoredFamilyId, storeFamilyId, pairWithFamily } from './pairing.js';
import { generateMission } from './questions.js';
import { createSession, currentQuestion, submitAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderHome, renderQuestion, renderResults, renderConnectionError } from './ui.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

let familyId = getStoredFamilyId();
let session = null;
let lastFeedback = null;
let soundEnabled = isSoundEnabled();
let lastProfile = null;

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function writeSession(targetFamilyId, summary) {
  await addDoc(collection(db, 'families', targetFamilyId, 'sessions'), {
    ...summary,
    timestamp: serverTimestamp(),
  });
}

async function loadProfile(targetFamilyId) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? snapshot.data()
    : { xp: 0, avatarLevel: 1, badges: [], streakDays: 0, lastSessionDate: null };
}

async function saveProfile(targetFamilyId, profile) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  await setDoc(ref, profile);
}

function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    soundEnabled,
    onStartMission: startMission,
    onToggleSound: toggleSound,
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  setSoundEnabled(soundEnabled);
  if (lastProfile) {
    renderHomeScreen(lastProfile);
  }
}

async function showHome() {
  try {
    await ensureAuth();
    const profile = await loadProfile(familyId);
    lastProfile = profile;
    renderHomeScreen(profile);
    flushQueue((summary) => writeSession(familyId, summary)).catch(() => {});
  } catch (err) {
    renderConnectionError(root, { onRetry: showHome });
  }
}

function startMission() {
  session = createSession(generateMission(MISSION_LENGTH));
  lastFeedback = null;
  showQuestion();
}

function showQuestion() {
  const question = currentQuestion(session);
  const elapsedMs = Date.now() - session.startedAt;
  renderQuestion(root, {
    question,
    index: session.index,
    total: session.questions.length,
    feedback: lastFeedback,
    showPauseReminder: elapsedMs >= PAUSE_REMINDER_MS,
    onAnswer: handleAnswer,
  });
}

async function handleAnswer(answer) {
  const isCorrect = submitAnswer(session, answer);
  lastFeedback = isCorrect ? 'correct' : 'incorrect';
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  if (isSessionComplete(session)) {
    await finishMission();
  } else {
    showQuestion();
  }
}

async function finishMission() {
  const summary = finishSession(session);
  const profileBefore = await loadProfile(familyId);
  const progressionResult = applyProgression(profileBefore, summary);
  const nextProfile = {
    ...profileBefore,
    xp: progressionResult.xp,
    avatarLevel: progressionResult.avatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    lastSessionDate: progressionResult.lastSessionDate,
  };
  await saveProfile(familyId, nextProfile).catch(() => {});
  try {
    await writeSession(familyId, summary);
  } catch (err) {
    enqueueSession(summary);
  }
  if (soundEnabled) {
    playMissionCompleteSound();
    if (progressionResult.leveledUp || progressionResult.newBadges.length > 0) {
      setTimeout(playLevelUpSound, 550);
    }
  }
  renderResults(root, {
    correctCount: summary.correctCount,
    questionsTotal: summary.questionsTotal,
    gainedXp: progressionResult.xp - profileBefore.xp,
    leveledUp: progressionResult.leveledUp,
    newBadges: progressionResult.newBadges,
    onContinue: showHome,
  });
}

async function handlePairing({ familyId: candidateId, pin }) {
  let result;
  try {
    await ensureAuth();
    result = await pairWithFamily(db, candidateId, pin);
  } catch (err) {
    renderPairing(root, {
      onSubmit: handlePairing,
      error: 'Connexion impossible. Vérifie le Wi-Fi et réessaie.',
    });
    return;
  }
  if (result.success) {
    storeFamilyId(candidateId);
    familyId = candidateId;
    showHome();
  } else {
    const message = result.reason === 'wrong-pin' ? 'Code secret incorrect.' : "Code d'appairage inconnu.";
    renderPairing(root, { onSubmit: handlePairing, error: message });
  }
}

function start() {
  if (familyId) {
    showHome();
  } else {
    renderPairing(root, { onSubmit: handlePairing });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

start();
```

- [ ] **Step 1: Replace the full contents of `src/child/main.js`**

```js
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { getStoredFamilyId, storeFamilyId, pairWithFamily } from './pairing.js';
import { generateMission } from './questions.js';
import { createSession, currentQuestion, submitAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderHome, renderQuestion, renderResults, renderConnectionError } from './ui.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

let familyId = getStoredFamilyId();
let session = null;
let lastFeedback = null;
let soundEnabled = isSoundEnabled();
let lastProfile = null;

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function writeSession(targetFamilyId, summary) {
  await addDoc(collection(db, 'families', targetFamilyId, 'sessions'), {
    ...summary,
    timestamp: serverTimestamp(),
  });
}

async function loadProfile(targetFamilyId) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? snapshot.data()
    : { xp: 0, avatarLevel: 1, badges: [], streakDays: 0, lastSessionDate: null, difficultyLevels: DEFAULT_DIFFICULTY_LEVELS };
}

async function saveProfile(targetFamilyId, profile) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  await setDoc(ref, profile);
}

function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    soundEnabled,
    onStartMission: startMission,
    onToggleSound: toggleSound,
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  setSoundEnabled(soundEnabled);
  if (lastProfile) {
    renderHomeScreen(lastProfile);
  }
}

async function showHome() {
  try {
    await ensureAuth();
    const profile = await loadProfile(familyId);
    lastProfile = profile;
    renderHomeScreen(profile);
    flushQueue((summary) => writeSession(familyId, summary)).catch(() => {});
  } catch (err) {
    renderConnectionError(root, { onRetry: showHome });
  }
}

function startMission() {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  session = createSession(generateMission(MISSION_LENGTH, difficultyLevels));
  lastFeedback = null;
  showQuestion();
}

function showQuestion() {
  const question = currentQuestion(session);
  const elapsedMs = Date.now() - session.startedAt;
  renderQuestion(root, {
    question,
    index: session.index,
    total: session.questions.length,
    feedback: lastFeedback,
    showPauseReminder: elapsedMs >= PAUSE_REMINDER_MS,
    onAnswer: handleAnswer,
  });
}

async function handleAnswer(answer) {
  const isCorrect = submitAnswer(session, answer);
  lastFeedback = isCorrect ? 'correct' : 'incorrect';
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  if (isSessionComplete(session)) {
    await finishMission();
  } else {
    showQuestion();
  }
}

async function finishMission() {
  const summary = finishSession(session);
  const profileBefore = await loadProfile(familyId);
  const progressionResult = applyProgression(profileBefore, summary);
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const nextProfile = {
    ...profileBefore,
    xp: progressionResult.xp,
    avatarLevel: progressionResult.avatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    lastSessionDate: progressionResult.lastSessionDate,
    difficultyLevels: nextDifficultyLevels,
  };
  await saveProfile(familyId, nextProfile).catch(() => {});
  try {
    await writeSession(familyId, summary);
  } catch (err) {
    enqueueSession(summary);
  }
  if (soundEnabled) {
    playMissionCompleteSound();
    if (progressionResult.leveledUp || progressionResult.newBadges.length > 0) {
      setTimeout(playLevelUpSound, 550);
    }
  }
  renderResults(root, {
    correctCount: summary.correctCount,
    questionsTotal: summary.questionsTotal,
    gainedXp: progressionResult.xp - profileBefore.xp,
    leveledUp: progressionResult.leveledUp,
    newBadges: progressionResult.newBadges,
    onContinue: showHome,
  });
}

async function handlePairing({ familyId: candidateId, pin }) {
  let result;
  try {
    await ensureAuth();
    result = await pairWithFamily(db, candidateId, pin);
  } catch (err) {
    renderPairing(root, {
      onSubmit: handlePairing,
      error: 'Connexion impossible. Vérifie le Wi-Fi et réessaie.',
    });
    return;
  }
  if (result.success) {
    storeFamilyId(candidateId);
    familyId = candidateId;
    showHome();
  } else {
    const message = result.reason === 'wrong-pin' ? 'Code secret incorrect.' : "Code d'appairage inconnu.";
    renderPairing(root, { onSubmit: handlePairing, error: message });
  }
}

function start() {
  if (familyId) {
    showHome();
  } else {
    renderPairing(root, { onSubmit: handlePairing });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

start();
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (all test files — 51 existing + 8 new from Task 1 + 5 new from Task 2's expanded question tests = 64 tests total across 11 files)

- [ ] **Step 3: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire per-type difficulty levels into child app orchestration"
```

---

### Task 6: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all 11 test files pass, 64 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing) and the parent dashboard (`http://localhost:5173/parent.html`, already logged in).

- [ ] **Step 3: Verify the parent dashboard shows difficulty tiers**

Confirm each line in "Réussite par notion" now reads like `addition : 75% — Début` (percent plus tier label), for all 4 types.

- [ ] **Step 4: Verify a mission adapts after strong performance**

Play a mission on the child app, deliberately answering at least 4 of the ~2-3 questions for one operation type correctly (aim for 80%+ on that type). Finish the mission, then reload the parent dashboard — confirm that type's tier advanced (e.g. Début → Confirmé).

- [ ] **Step 5: Verify a mission adapts after weak performance**

Play another mission, deliberately answering fewer than half of one type's questions correctly. Finish it, reload the parent dashboard, and confirm that type's tier did not increase (and dropped by one level if it wasn't already at the minimum).

- [ ] **Step 6: Verify harder tiers actually produce harder questions**

Once a type has reached "Confirmé" or "Avancé", start a new mission and confirm questions of that type visibly use larger numbers (or, for multiplication, tables beyond ×2/×5/×10) than at "Début".

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-6 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
