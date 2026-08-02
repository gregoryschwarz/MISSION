# Variété de mini-jeux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each mission a randomly-picked interaction format — Quiz classique (existant), QCM éclair (choix multiple), or Chasse aux paires (jeu d'association) — alternating so the same format never plays twice in a row, while reusing the exact same question generation and adaptive difficulty already in place.

**Architecture:** Three new pure modules (`missionMode.js`, `choices.js`, `pairsGame.js`) own format selection, QCM distractor generation, and pairs-matching logic respectively. `src/child/session.js` gets a factored-out `recordAnswer` so both the existing per-question flow and the new pairs-matching flow update the same `breakdown`/`correctCount` that `adjustDifficultyLevels` already consumes. `src/child/ui.js` gains two new render functions; `src/child/main.js` picks a format at mission start and routes to the right render/handler pair.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Mission mode selection (TDD)

**Files:**
- Create: `src/child/missionMode.js`
- Test: `tests/child/missionMode.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/missionMode.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from '../../src/child/missionMode.js';

const ALL_MODES = ['quiz', 'qcm', 'pairs'];

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('pickMissionMode', () => {
  it('never returns the same mode as lastMode', () => {
    ALL_MODES.forEach((lastMode) => {
      for (let i = 0; i < 30; i++) {
        expect(pickMissionMode(lastMode)).not.toBe(lastMode);
      }
    });
  });

  it('only returns known modes', () => {
    for (let i = 0; i < 30; i++) {
      expect(ALL_MODES).toContain(pickMissionMode('quiz'));
    }
  });

  it('eventually picks both remaining modes when excluding one', () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      seen.add(pickMissionMode('quiz'));
    }
    expect(seen).toEqual(new Set(['qcm', 'pairs']));
  });

  it('allows any of the 3 modes when lastMode is null or unknown', () => {
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      seen.add(pickMissionMode(null));
    }
    expect(seen).toEqual(new Set(ALL_MODES));
  });
});

describe('mission mode storage', () => {
  it('returns null when nothing is stored', () => {
    const storage = createFakeStorage();
    expect(getLastMissionMode(storage)).toBe(null);
  });

  it('stores and retrieves the last mission mode', () => {
    const storage = createFakeStorage();
    storeLastMissionMode('qcm', storage);
    expect(getLastMissionMode(storage)).toBe('qcm');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/missionMode.test.js`
Expected: FAIL — cannot find module `../../src/child/missionMode.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/missionMode.js`:

```js
const STORAGE_KEY = 'missionsDeLuna.lastMissionMode';
const ALL_MODES = ['quiz', 'qcm', 'pairs'];

export function pickMissionMode(lastMode) {
  const candidates = ALL_MODES.filter((mode) => mode !== lastMode);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getLastMissionMode(storage = window.localStorage) {
  return storage.getItem(STORAGE_KEY);
}

export function storeLastMissionMode(mode, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, mode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/missionMode.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/missionMode.js tests/child/missionMode.test.js
git commit -m "feat: add mission mode selection with guaranteed alternation"
```

---

### Task 2: QCM distractor generation (TDD)

**Files:**
- Create: `src/child/choices.js`
- Test: `tests/child/choices.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/choices.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { generateChoices } from '../../src/child/choices.js';

describe('generateChoices', () => {
  it('returns exactly [">", "<"] for comparaison questions', () => {
    const question = { type: 'comparaison', a: 5, b: 8, answer: '<', prompt: '5 ___ 8', options: ['>', '<'] };
    expect(generateChoices(question)).toEqual(['>', '<']);
  });

  it('includes the correct answer among 3 distinct, non-negative choices for addition', () => {
    const question = { type: 'addition', a: 20, b: 30, answer: 50, prompt: '20 + 30' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(50);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('includes the correct answer among 3 distinct, non-negative choices for subtraction near zero', () => {
    const question = { type: 'soustraction', a: 10, b: 9, answer: 1, prompt: '10 - 9' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(1);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('includes the correct answer among 3 distinct, non-negative choices for multiplication', () => {
    const question = { type: 'multiplication', a: 2, b: 3, answer: 6, prompt: '2 x 3' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(6);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('keeps distractors within a close range (±5) of the correct answer', () => {
    const question = { type: 'addition', a: 20, b: 30, answer: 50, prompt: '20 + 30' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      choices.forEach((c) => expect(Math.abs(c - 50)).toBeLessThanOrEqual(5));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/choices.test.js`
Expected: FAIL — cannot find module `../../src/child/choices.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/choices.js`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/choices.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/choices.js tests/child/choices.test.js
git commit -m "feat: generate multiple-choice distractors for QCM mode"
```

---

### Task 3: Pairs-matching game logic (TDD)

**Files:**
- Create: `src/child/pairsGame.js`
- Test: `tests/child/pairsGame.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/pairsGame.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from '../../src/child/pairsGame.js';

const sampleQuestions = [
  { type: 'addition', a: 2, b: 3, answer: 5, prompt: '2 + 3' },
  { type: 'soustraction', a: 9, b: 4, answer: 5, prompt: '9 - 4' },
  { type: 'multiplication', a: 2, b: 3, answer: 6, prompt: '2 x 3' },
];

describe('createPairsRound', () => {
  it('produces one calc tile and one result tile per question', () => {
    const round = createPairsRound(sampleQuestions);
    expect(round.calcTiles).toHaveLength(3);
    expect(round.resultTiles).toHaveLength(3);
    const calcAnswers = round.calcTiles.map((t) => t.answer).sort();
    const resultAnswers = round.resultTiles.map((t) => t.answer).sort();
    expect(calcAnswers).toEqual(resultAnswers);
  });

  it('gives each calc tile the prompt and type of its source question', () => {
    const round = createPairsRound(sampleQuestions);
    const additionTile = round.calcTiles.find((t) => t.prompt === '2 + 3');
    expect(additionTile.type).toBe('addition');
    expect(additionTile.answer).toBe(5);
  });

  it('starts with no matched tiles', () => {
    const round = createPairsRound(sampleQuestions);
    expect(round.matchedCalcIds.size).toBe(0);
    expect(round.matchedResultIds.size).toBe(0);
  });
});

describe('attemptMatch', () => {
  it('marks a correct pairing as matched and reports firstAttempt true', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const resultTile = round.resultTiles.find((t) => t.answer === 6);
    const result = attemptMatch(round, calcTile.id, resultTile.id);
    expect(result).toEqual({ isCorrect: true, firstAttempt: true });
    expect(round.matchedCalcIds.has(calcTile.id)).toBe(true);
    expect(round.matchedResultIds.has(resultTile.id)).toBe(true);
  });

  it('reports an incorrect pairing without marking anything matched', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const wrongResultTile = round.resultTiles.find((t) => t.answer !== 6);
    const result = attemptMatch(round, calcTile.id, wrongResultTile.id);
    expect(result.isCorrect).toBe(false);
    expect(round.matchedCalcIds.size).toBe(0);
  });

  it('reports firstAttempt only on the very first try for a given calc tile', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const wrongResultTile = round.resultTiles.find((t) => t.answer !== 6);
    const correctResultTile = round.resultTiles.find((t) => t.answer === 6);

    const first = attemptMatch(round, calcTile.id, wrongResultTile.id);
    expect(first.firstAttempt).toBe(true);

    const second = attemptMatch(round, calcTile.id, correctResultTile.id);
    expect(second.firstAttempt).toBe(false);
    expect(second.isCorrect).toBe(true);
  });
});

describe('isPairsRoundComplete', () => {
  it('is false until every calc tile is matched', () => {
    const round = createPairsRound(sampleQuestions);
    expect(isPairsRoundComplete(round)).toBe(false);
  });

  it('is true once every calc tile has been correctly matched', () => {
    const round = createPairsRound(sampleQuestions);
    round.calcTiles.forEach((calcTile) => {
      const resultTile = round.resultTiles.find(
        (t) => t.answer === calcTile.answer && !round.matchedResultIds.has(t.id)
      );
      attemptMatch(round, calcTile.id, resultTile.id);
    });
    expect(isPairsRoundComplete(round)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/pairsGame.test.js`
Expected: FAIL — cannot find module `../../src/child/pairsGame.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/pairsGame.js`:

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

export function createPairsRound(questions) {
  const calcTiles = shuffle(
    questions.map((q, i) => ({ id: `calc-${i}`, type: q.type, prompt: q.prompt, answer: q.answer }))
  );
  const resultTiles = shuffle(
    questions.map((q, i) => ({ id: `result-${i}`, answer: q.answer }))
  );
  return {
    calcTiles,
    resultTiles,
    matchedCalcIds: new Set(),
    matchedResultIds: new Set(),
    attemptedCalcIds: new Set(),
  };
}

export function attemptMatch(round, calcTileId, resultTileId) {
  const calcTile = round.calcTiles.find((t) => t.id === calcTileId);
  const resultTile = round.resultTiles.find((t) => t.id === resultTileId);
  const isCorrect = calcTile.answer === resultTile.answer;
  const firstAttempt = !round.attemptedCalcIds.has(calcTileId);
  round.attemptedCalcIds.add(calcTileId);
  if (isCorrect) {
    round.matchedCalcIds.add(calcTileId);
    round.matchedResultIds.add(resultTileId);
  }
  return { isCorrect, firstAttempt };
}

export function isPairsRoundComplete(round) {
  return round.matchedCalcIds.size === round.calcTiles.length;
}
```

Note: `createPairsRound` and `attemptMatch` match tiles by comparing `answer` values rather than by shared origin index. This is safe even when two different questions happen to share the same answer (e.g. two questions both equal to 5): both tile sets always contain the exact same multiset of answer values, so after any number of correct matches the remaining calc tiles and remaining result tiles still balance out — there's always a valid result tile available for every remaining calc tile.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/pairsGame.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/pairsGame.js tests/child/pairsGame.test.js
git commit -m "feat: add pairs-matching game logic"
```

---

### Task 4: Factor out recordAnswer in session.js (TDD)

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

export function submitAnswer(session, answer) {
  if (isSessionComplete(session)) {
    throw new Error('Cannot submit answer: session is complete');
  }
  const question = currentQuestion(session);
  const isCorrect = answer === question.answer;
  const breakdown = session.breakdown[question.type];
  breakdown.total += 1;
  if (isCorrect) {
    breakdown.correct += 1;
    session.correctCount += 1;
  }
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

`recordAnswer` only needs `question.type` from its `question` argument — it does not read `question.answer`, so callers can pass either a full generated question or a pairs-game calc tile (both carry a `type` field).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/child/session.test.js` with:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  createSession,
  currentQuestion,
  submitAnswer,
  recordAnswer,
  isSessionComplete,
  finishSession,
} from '../../src/child/session.js';

const sampleQuestions = [
  { type: 'addition', a: 2, b: 3, answer: 5, prompt: '2 + 3' },
  { type: 'multiplication', a: 3, b: 4, answer: 12, prompt: '3 x 4' },
];

describe('session flow', () => {
  it('tracks correct and incorrect answers per type', () => {
    const session = createSession(sampleQuestions);
    expect(currentQuestion(session).prompt).toBe('2 + 3');

    expect(submitAnswer(session, 5)).toBe(true);
    expect(submitAnswer(session, 99)).toBe(false);

    expect(session.correctCount).toBe(1);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 1 });
    expect(session.breakdown.multiplication).toEqual({ correct: 0, total: 1 });
    expect(isSessionComplete(session)).toBe(true);
  });

  it('returns false initially, before any answers', () => {
    const session = createSession(sampleQuestions);
    expect(isSessionComplete(session)).toBe(false);
  });

  it('throws when submitting an answer after the session is already complete', () => {
    const session = createSession(sampleQuestions);
    submitAnswer(session, 5);
    submitAnswer(session, 12);
    expect(() => submitAnswer(session, 5)).toThrow();
  });

  it('produces a summary with duration and breakdown', () => {
    vi.useFakeTimers();
    const session = createSession(sampleQuestions);
    vi.advanceTimersByTime(5000);
    submitAnswer(session, 5);
    submitAnswer(session, 12);
    const summary = finishSession(session);
    expect(summary.questionsTotal).toBe(2);
    expect(summary.correctCount).toBe(2);
    expect(summary.durationSeconds).toBe(5);
    expect(summary.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.useRealTimers();
  });
});

describe('recordAnswer', () => {
  it('updates breakdown and correctCount for a correct answer, without touching the index', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'addition' }, true);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 1 });
    expect(session.correctCount).toBe(1);
    expect(session.index).toBe(0);
  });

  it('updates breakdown without incrementing correctCount for an incorrect answer', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'multiplication' }, false);
    expect(session.breakdown.multiplication).toEqual({ correct: 0, total: 1 });
    expect(session.correctCount).toBe(0);
  });

  it('accumulates across multiple calls for the same type', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'addition' }, true);
    recordAnswer(session, { type: 'addition' }, false);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/session.test.js`
Expected: FAIL — `recordAnswer` is not exported from `../../src/child/session.js`

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/child/session.js` with:

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

Note: `recordAnswer` deliberately does not touch `session.index`. `submitAnswer` (used by the quiz and QCM formats, which show one question at a time) still owns `index` advancement itself. The pairs format never uses `session.index`/`currentQuestion`/`isSessionComplete` at all — it tracks its own completion via `isPairsRoundComplete` from `pairsGame.js`, and `finishSession` doesn't read `index`, so this is safe.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/session.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: factor out recordAnswer for reuse by non-linear mission formats"
```

---

### Task 5: Pairs grid CSS

**Files:**
- Modify: `src/child/style.css`

- [ ] **Step 1: Add flex-wrap to the existing `.options` rule**

Find this rule near the top of `src/child/style.css`:

```css
.options {
  display: flex;
  gap: 12px;
}
```

Replace it with:

```css
.options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
```

This is the only change needed for QCM éclair — it reuses the existing `.big-button.answer-btn` styling already used for comparaison questions, just with 3 buttons instead of 2, and `flex-wrap` keeps 3 numeric buttons from overflowing on a narrow tablet width.

- [ ] **Step 2: Append pairs-grid rules to the end of `src/child/style.css`**

Add at the end of the file:

```css
.pairs-grid {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 12px;
}

.pairs-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.pairs-tile {
  font-size: 16px;
  padding: 10px;
  border-radius: 12px;
  border: 2px solid #c9b8ff;
  background: white;
  cursor: pointer;
}

.pairs-tile.selected {
  background: #c9b8ff;
  color: white;
}

.pairs-tile:active {
  transform: scale(0.97);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add styles for the pairs-matching mini-game"
```

---

### Task 6: New render functions for QCM and pairs formats

**Files:**
- Modify: `src/child/ui.js`

The current content of `src/child/ui.js` (relevant part — `renderPairing`, `renderHome`, `renderResults`, `renderConnectionError` are unchanged and omitted here for brevity, but must remain untouched in the file):

```js
export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder }) {
  const isComparison = question.type === 'comparaison';
  root.innerHTML = `
    <div class="screen mission-screen">
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
}
```

- [ ] **Step 1: Add `renderQuestionQcm` right after `renderQuestion`**

Insert this new function immediately after the existing `renderQuestion` function in `src/child/ui.js`:

```js
export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder }) {
  root.innerHTML = `
    <div class="screen mission-screen">
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
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
}
```

- [ ] **Step 2: Add `renderPairsRound` right after `renderQuestionQcm`**

```js
export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch }) {
  let selectedCalcId = null;

  function draw() {
    const remainingCalc = round.calcTiles.filter((t) => !round.matchedCalcIds.has(t.id));
    const remainingResult = round.resultTiles.filter((t) => !round.matchedResultIds.has(t.id));
    root.innerHTML = `
      <div class="screen mission-screen pairs-screen">
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
  }

  draw();
}
```

`renderPairsRound` owns the transient "which calc tile is currently selected, awaiting a result tile" state internally via the `selectedCalcId` closure variable — it resets naturally each time the caller re-invokes `renderPairsRound` after a match attempt, matching the existing pattern where every render call fully replaces `root.innerHTML`.

No test file changes for this task — consistent with the rest of the project, which doesn't unit-test HTML rendering functions (verified manually in the final task).

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: add QCM and pairs-matching render functions"
```

---

### Task 7: Wire mission modes into child orchestration

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

- [ ] **Step 1: Replace the full contents of `src/child/main.js`**

```js
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { getStoredFamilyId, storeFamilyId, pairWithFamily } from './pairing.js';
import { generateMission } from './questions.js';
import { createSession, currentQuestion, submitAnswer, recordAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderHome, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderConnectionError } from './ui.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from './missionMode.js';
import { generateChoices } from './choices.js';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from './pairsGame.js';

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

let familyId = getStoredFamilyId();
let session = null;
let missionMode = 'quiz';
let pairsRound = null;
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
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  session = createSession(generateMission(MISSION_LENGTH, difficultyLevels));
  lastFeedback = null;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}

function showQuestion() {
  const question = currentQuestion(session);
  const elapsedMs = Date.now() - session.startedAt;
  const showPauseReminder = elapsedMs >= PAUSE_REMINDER_MS;
  if (missionMode === 'qcm') {
    renderQuestionQcm(root, {
      question,
      choices: generateChoices(question),
      index: session.index,
      total: session.questions.length,
      feedback: lastFeedback,
      showPauseReminder,
      onAnswer: handleAnswer,
    });
  } else {
    renderQuestion(root, {
      question,
      index: session.index,
      total: session.questions.length,
      feedback: lastFeedback,
      showPauseReminder,
      onAnswer: handleAnswer,
    });
  }
}

function showPairsRound() {
  const elapsedMs = Date.now() - session.startedAt;
  renderPairsRound(root, {
    round: pairsRound,
    feedback: lastFeedback,
    showPauseReminder: elapsedMs >= PAUSE_REMINDER_MS,
    onMatch: handlePairsMatch,
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

async function handlePairsMatch(calcTileId, resultTileId) {
  const { isCorrect, firstAttempt } = attemptMatch(pairsRound, calcTileId, resultTileId);
  if (firstAttempt) {
    const calcTile = pairsRound.calcTiles.find((t) => t.id === calcTileId);
    recordAnswer(session, calcTile, isCorrect);
  }
  lastFeedback = isCorrect ? 'correct' : 'incorrect';
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  if (isPairsRoundComplete(pairsRound)) {
    await finishMission();
  } else {
    showPairsRound();
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
  pairsRound = null;
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
Expected: PASS — all test files green (68 existing + 6 from Task 1 + 5 from Task 2 + 7 from Task 3 + 3 new in Task 4 = 89 tests total across 14 files)

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: builds without errors

- [ ] **Step 4: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire mission mode selection into child app orchestration"
```

---

### Task 8: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all 14 test files pass, 89 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing).

- [ ] **Step 3: Verify each format renders and plays correctly**

Play missions repeatedly (clear `localStorage` key `missionsDeLuna.lastMissionMode` between tries if needed to force variety) until you've seen all 3 formats:
- **Quiz classique**: unchanged from today — typed numeric answer, `>`/`<` buttons for comparaison.
- **QCM éclair**: 3 buttons per question (or 2 for comparaison), tapping the correct one advances, tapping a wrong one shows the "🤔 Presque !" feedback and still advances (same behavior as today's wrong-answer handling).
- **Chasse aux paires**: a grid of 5 calculs on the left and 5 résultats on the right; tapping a calcul then a résultat either matches (both disappear from the grid, progress counter increments) or shows incorrect feedback and lets you retry.

- [ ] **Step 4: Verify alternation**

Play at least 3 missions in a row and confirm the format is never the same twice consecutively.

- [ ] **Step 5: Verify the pairs game handles duplicate answers**

Play pairs missions until you see a case where two calculs share the same résultat value (e.g. two different additions both equal to the same number) — confirm both can still be matched correctly to their own distinct résultat tile.

- [ ] **Step 6: Verify difficulty adaptation still works across formats**

Confirm on the parent dashboard (`http://localhost:5173/parent.html`) that a mission's `breakdown`-driven difficulty tier change (from the difficulté progressive feature) still applies correctly regardless of which format the mission used.

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-4 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
