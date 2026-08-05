# Vue de progression parent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly heat-map view of per-notion accuracy to the parent dashboard, so a parent can see whether a notion is improving, stalling, or regressing over the last 8 weeks.

**Architecture:** Two new pure functions (`weeklyBreakdownByType`, `colorForPercent`) live in `src/parent/dashboard.js` next to the existing `aggregateBreakdown`, operating only on the `sessions` array already fetched by the parent app. `renderDashboard` gains a new `<section class="weekly-progress">` between the existing "Réussite par notion" and "Sessions récentes" sections, rendering a table with notions as rows and the 8 most recent calendar weeks as columns.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Weekly breakdown and color-tier logic (TDD)

**Files:**
- Modify: `src/parent/dashboard.js`
- Modify: `tests/parent/dashboard.test.js`

The current content of `tests/parent/dashboard.test.js` is:

```js
import { describe, it, expect } from 'vitest';
import { aggregateBreakdown } from '../../src/parent/dashboard.js';

describe('aggregateBreakdown', () => {
  it('computes a success percentage per question type across sessions', () => {
    const sessions = [
      { breakdown: { addition: { correct: 4, total: 5 }, multiplication: { correct: 1, total: 5 } } },
      { breakdown: { addition: { correct: 4, total: 5 }, multiplication: { correct: 3, total: 5 } } },
    ];
    expect(aggregateBreakdown(sessions)).toEqual({
      addition: 80,
      multiplication: 40,
    });
  });

  it('returns an empty object for no sessions', () => {
    expect(aggregateBreakdown([])).toEqual({});
  });
});
```

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `tests/parent/dashboard.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { aggregateBreakdown, weeklyBreakdownByType, colorForPercent } from '../../src/parent/dashboard.js';

describe('aggregateBreakdown', () => {
  it('computes a success percentage per question type across sessions', () => {
    const sessions = [
      { breakdown: { addition: { correct: 4, total: 5 }, multiplication: { correct: 1, total: 5 } } },
      { breakdown: { addition: { correct: 4, total: 5 }, multiplication: { correct: 3, total: 5 } } },
    ];
    expect(aggregateBreakdown(sessions)).toEqual({
      addition: 80,
      multiplication: 40,
    });
  });

  it('returns an empty object for no sessions', () => {
    expect(aggregateBreakdown([])).toEqual({});
  });
});

describe('weeklyBreakdownByType', () => {
  const referenceDate = new Date('2026-08-05T00:00:00Z');

  it("builds an 8-week window ending on the reference date's week, oldest first", () => {
    const sessions = [{ date: '2026-08-03', breakdown: { addition: { correct: 3, total: 4 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.addition.map((w) => w.weekLabel)).toEqual([
      '15/06', '22/06', '29/06', '06/07', '13/07', '20/07', '27/07', '03/08',
    ]);
  });

  it('groups a session into the correct calendar week (Monday-Sunday)', () => {
    const sessions = [
      { date: '2026-08-02', breakdown: { addition: { correct: 1, total: 1 } } }, // Sunday -> week of 27/07
      { date: '2026-08-03', breakdown: { addition: { correct: 1, total: 1 } } }, // Monday -> week of 03/08
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const byLabel = Object.fromEntries(result.addition.map((w) => [w.weekLabel, w.percent]));
    expect(byLabel['27/07']).toBe(100);
    expect(byLabel['03/08']).toBe(100);
  });

  it('returns percent: null for a week with no session for that type', () => {
    const sessions = [{ date: '2026-08-03', breakdown: { addition: { correct: 3, total: 4 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const byLabel = Object.fromEntries(result.addition.map((w) => [w.weekLabel, w.percent]));
    expect(byLabel['27/07']).toBe(null);
    expect(byLabel['03/08']).toBe(75);
  });

  it('ignores sessions older than the 8-week window but still lists the type with null weeks', () => {
    const sessions = [{ date: '2026-06-01', breakdown: { multiplication: { correct: 2, total: 2 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.multiplication).toBeDefined();
    result.multiplication.forEach((w) => expect(w.percent).toBe(null));
  });

  it('aggregates multiple sessions in the same week for the same type', () => {
    const sessions = [
      { date: '2026-08-03', breakdown: { addition: { correct: 3, total: 5 } } },
      { date: '2026-08-04', breakdown: { addition: { correct: 4, total: 5 } } },
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const currentWeek = result.addition.find((w) => w.weekLabel === '03/08');
    expect(currentWeek.percent).toBe(70);
  });

  it('tracks different types independently, each with 8 entries', () => {
    const sessions = [
      {
        date: '2026-08-03',
        breakdown: { addition: { correct: 1, total: 1 }, soustraction: { correct: 0, total: 1 } },
      },
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.addition).toHaveLength(8);
    expect(result.soustraction).toHaveLength(8);
    const additionCurrent = result.addition.find((w) => w.weekLabel === '03/08');
    const soustractionCurrent = result.soustraction.find((w) => w.weekLabel === '03/08');
    expect(additionCurrent.percent).toBe(100);
    expect(soustractionCurrent.percent).toBe(0);
  });

  it('returns an empty object for no sessions', () => {
    expect(weeklyBreakdownByType([], { referenceDate })).toEqual({});
  });
});

describe('colorForPercent', () => {
  it('returns the "no data" color for null', () => {
    expect(colorForPercent(null)).toBe('#e5e0f5');
  });

  it('returns red below 50%', () => {
    expect(colorForPercent(0)).toBe('#ffb4a2');
    expect(colorForPercent(49)).toBe('#ffb4a2');
  });

  it('returns yellow/orange between 50% and 74%', () => {
    expect(colorForPercent(50)).toBe('#ffe5a0');
    expect(colorForPercent(74)).toBe('#ffe5a0');
  });

  it('returns green at 75% and above', () => {
    expect(colorForPercent(75)).toBe('#c8f0c8');
    expect(colorForPercent(100)).toBe('#c8f0c8');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/parent/dashboard.test.js`
Expected: FAIL — `weeklyBreakdownByType` and `colorForPercent` are not exported from `src/parent/dashboard.js`.

- [ ] **Step 3: Write the implementation**

The current content of `src/parent/dashboard.js` is:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';
import { DIFFICULTY_LABELS, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

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
  const difficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
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
        ${renderBadgeMedallionsHtml(profile.badges)}
      </section>
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => {
              const level = difficultyLevels[type] ?? 1;
              return `<li>${type} : ${percent}% — ${DIFFICULTY_LABELS[level]}</li>`;
            })
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

Insert the following new code right after `aggregateBreakdown` (before `renderDashboard`), and leave `renderDashboard` untouched for this task:

```js
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart) {
  const dd = String(weekStart.getUTCDate()).padStart(2, '0');
  const mm = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function weeklyBreakdownByType(sessions, { weekCount = 8, referenceDate = new Date() } = {}) {
  const currentWeekStart = startOfWeek(referenceDate);
  const weekStarts = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    weekStarts.push(new Date(currentWeekStart.getTime() - i * WEEK_MS));
  }

  const types = new Set();
  sessions.forEach((session) => {
    Object.keys(session.breakdown).forEach((type) => types.add(type));
  });

  const buckets = {}; // weekLabel -> { type -> { correct, total } }
  weekStarts.forEach((weekStart) => {
    buckets[formatWeekLabel(weekStart)] = {};
  });

  sessions.forEach((session) => {
    const sessionWeekStart = startOfWeek(new Date(session.date));
    const label = formatWeekLabel(sessionWeekStart);
    if (!(label in buckets)) return; // hors de la fenêtre des weekCount semaines
    Object.entries(session.breakdown).forEach(([type, { correct, total }]) => {
      if (!buckets[label][type]) buckets[label][type] = { correct: 0, total: 0 };
      buckets[label][type].correct += correct;
      buckets[label][type].total += total;
    });
  });

  const result = {};
  types.forEach((type) => {
    result[type] = weekStarts.map((weekStart) => {
      const label = formatWeekLabel(weekStart);
      const entry = buckets[label][type];
      return {
        weekLabel: label,
        percent: entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null,
      };
    });
  });
  return result;
}

export function colorForPercent(percent) {
  if (percent === null) return '#e5e0f5'; // gris-mauve clair, "pas de données"
  if (percent < 50) return '#ffb4a2';
  if (percent < 75) return '#ffe5a0';
  return '#c8f0c8';
}
```

`weeklyBreakdownByType` mirrors `aggregateBreakdown`'s accumulation pattern (`correct`/`total` per type) with an added week-grouping pass. `referenceDate` defaults to `new Date()` but is injectable for deterministic tests. Session dates are `'YYYY-MM-DD'` strings (already produced by `finishSession` in `src/child/session.js` via `toISOString().slice(0, 10)`); parsing them with `new Date(...)` interprets them as UTC midnight, so using `getUTCDay()`/`setUTCDate()`/`getUTCDate()` throughout keeps week-boundary math consistent with how those dates were generated.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/parent/dashboard.test.js`
Expected: PASS (12 tests: 2 existing `aggregateBreakdown` + 7 new `weeklyBreakdownByType` + 4 new `colorForPercent`, note the file also still has the pre-existing "returns an empty object for no sessions" test under `aggregateBreakdown` distinct from the same-named one under `weeklyBreakdownByType` — different describe blocks, no name collision)

- [ ] **Step 5: Commit**

```bash
git add src/parent/dashboard.js tests/parent/dashboard.test.js
git commit -m "feat: add weekly per-notion breakdown and color-tier logic (TDD)"
```

---

### Task 2: CSS for the weekly progress table

**Files:**
- Modify: `src/parent/style.css`

The current end of `src/parent/style.css` is:

```css
.badge-category {
  margin: 4px 0;
}

.badge-category-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin: 4px 0;
}
```

- [ ] **Step 1: Append to the end of `src/parent/style.css`**

```css

.weekly-progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.weekly-progress-table th,
.weekly-progress-table td {
  padding: 6px;
  text-align: center;
}

.weekly-progress-table th {
  color: #888;
  font-weight: normal;
  font-size: 11px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/parent/style.css
git commit -m "feat: add styles for the weekly progress heat-map table"
```

---

### Task 3: Render the weekly progress section on the parent dashboard

**Files:**
- Modify: `src/parent/dashboard.js`

- [ ] **Step 1: Extend the `badges.js` import to include `BADGES`**

Find:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';
```

Replace with:

```js
import { BADGES, renderBadgeMedallionsHtml } from '../shared/badges.js';
```

- [ ] **Step 2: Add a private `emojiForType` helper**

Insert right after the `colorForPercent` function added in Task 1 (before `renderDashboard`):

```js
function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
```

`emojiForType` is private (not exported), following the same pattern as `src/child/ui.js`'s private `customizeMedallionHtml`. It resolves a question type (e.g. `'addition'`) to the emoji already defined for that type's mastery badge in `src/shared/badges.js` (e.g. `mastery-addition` → ➕), so the notion emoji stays defined in exactly one place across the app.

- [ ] **Step 3: Replace `renderDashboard`**

Find the current `renderDashboard` function (unchanged from Task 1's snapshot above) and replace it with:

```js
export function renderDashboard(root, { family, profile, sessions, onSignOut }) {
  const breakdown = aggregateBreakdown(sessions);
  const difficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const weeklyBreakdown = weeklyBreakdownByType(sessions);
  const weekLabels = Object.values(weeklyBreakdown)[0]?.map((w) => w.weekLabel) ?? [];
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
        ${renderBadgeMedallionsHtml(profile.badges)}
      </section>
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => {
              const level = difficultyLevels[type] ?? 1;
              return `<li>${type} : ${percent}% — ${DIFFICULTY_LABELS[level]}</li>`;
            })
            .join('')}
        </ul>
      </section>
      <section class="weekly-progress">
        <h2>Évolution par semaine</h2>
        <table class="weekly-progress-table">
          <thead>
            <tr>
              <th></th>
              ${weekLabels.map((label) => `<th>${label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Object.entries(weeklyBreakdown)
              .map(
                ([type, weeks]) => `
              <tr>
                <td>${emojiForType(type)}</td>
                ${weeks
                  .map(
                    (w) =>
                      `<td style="background:${colorForPercent(w.percent)}">${w.percent === null ? '' : w.percent + '%'}</td>`
                  )
                  .join('')}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
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

`weekLabels` is derived from the first type's array in `weeklyBreakdown` (every type shares the same 8 `weekLabel` values, by construction of `weeklyBreakdownByType`); if `weeklyBreakdown` is empty (no sessions at all), it falls back to an empty array via `?? []`, so the table renders with no header columns and no rows — consistent with how the existing "Réussite par notion" list already degrades to an empty `<ul>` when `sessions` is empty.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass (this task adds no new tests — it only wires already-tested pure functions into the DOM rendering, which this project does not unit-test, consistent with `renderHome`/`renderCustomize` etc.)

- [ ] **Step 5: Commit**

```bash
git add src/parent/dashboard.js
git commit -m "feat: render weekly progress heat-map on parent dashboard"
```

---

### Task 4: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, 154 tests total (142 existing + 12 new from Task 1).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the parent app (`http://localhost:5173/parent.html`) and sign in with an existing parent account that has session history.

- [ ] **Step 3: Verify the weekly progress section**

Confirm a new "Évolution par semaine" section appears between "Réussite par notion" and "Sessions récentes", showing one row per notion already practiced, 8 week columns labeled `dd/mm`, colored cells (red/orange/green) for weeks with missions, and empty grey cells for weeks with no missions for that notion.

- [ ] **Step 4: Verify with an account that has little or no session history**

Confirm the dashboard doesn't crash for a profile with zero or very few sessions — the weekly progress table should render with mostly (or entirely) empty grey cells rather than erroring.

- [ ] **Step 5: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify step 3 against the live URL.
