# Badges Visuels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text badge display (a numeric count on the child screen, a comma-joined list on the parent dashboard) with colored circular medallions — colored + emoji when earned, grayed out with a lock icon when not — for the 3 existing streak badges.

**Architecture:** A new pure, shared module (`src/shared/badges.js`) defines the badge metadata and a pure HTML-string renderer, imported by both the child UI (`src/child/ui.js`) and the parent dashboard (`src/parent/dashboard.js`). No changes to Firestore data, security rules, or the progression logic that computes which badges are earned.

**Tech Stack:** Vanilla JavaScript, CSS, Vitest.

---

### Task 1: Shared badges module (TDD)

**Files:**
- Create: `src/shared/badges.js`
- Test: `tests/shared/badges.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/badges.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines exactly the 3 streak badges in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual(['streak-3', 'streak-7', 'streak-30']);
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3']);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'streak-3', earned: true });
    expect(result[1]).toMatchObject({ id: 'streak-7', earned: false });
    expect(result[2]).toMatchObject({ id: 'streak-30', earned: false });
  });

  it('marks no badges as earned for an empty list', () => {
    const result = badgeMedallionData([]);
    result.forEach((b) => expect(b.earned).toBe(false));
  });

  it('preserves the fixed badge order regardless of input order', () => {
    const result = badgeMedallionData(['streak-30', 'streak-3']);
    expect(result.map((b) => b.id)).toEqual(['streak-3', 'streak-7', 'streak-30']);
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: FAIL — cannot find module `../../src/shared/badges.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/badges.js`:

```js
export const BADGES = [
  { id: 'streak-3', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
];

export function badgeMedallionData(earnedBadgeIds) {
  return BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
  }));
}

export function renderBadgeMedallionsHtml(earnedBadgeIds) {
  return badgeMedallionData(earnedBadgeIds)
    .map((badge) => {
      if (badge.earned) {
        return `<div class="badge-medallion earned" style="background: linear-gradient(135deg, ${badge.gradient[0]}, ${badge.gradient[1]})" title="${badge.label}">${badge.emoji}</div>`;
      }
      return `<div class="badge-medallion locked" title="${badge.label}">🔒</div>`;
    })
    .join('');
}
```

Note: `BADGES`' `gradient` values and `label`/`emoji` strings are fixed internal constants (never user input), so interpolating them directly into the HTML string is safe — consistent with how other fixed internal strings (badge ids, question types) are already handled elsewhere in this codebase.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add shared badge metadata and medallion HTML renderer"
```

---

### Task 2: Badge medallion CSS

**Files:**
- Modify: `src/child/style.css`
- Modify: `src/parent/style.css`

- [ ] **Step 1: Append to `src/child/style.css`**

Add this block at the end of the file (after the existing `@media (prefers-reduced-motion: reduce)` block):

```css
.badges-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 8px 0;
}

.badge-medallion {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.badge-medallion.locked {
  background: #e0e0e0;
  filter: grayscale(1);
  opacity: 0.5;
  box-shadow: none;
}
```

- [ ] **Step 2: Append to `src/parent/style.css`**

Add this block at the end of the file:

```css
.badges-row {
  display: flex;
  gap: 12px;
  margin: 8px 0;
}

.badge-medallion {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.badge-medallion.locked {
  background: #e0e0e0;
  filter: grayscale(1);
  opacity: 0.5;
  box-shadow: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/child/style.css src/parent/style.css
git commit -m "feat: add badge medallion styles to child and parent stylesheets"
```

---

### Task 3: Render medallions in the child home screen

**Files:**
- Modify: `src/child/ui.js`

Read the current `renderHome` function first. It currently is:

```js
export function renderHome(root, { childName, avatarLevel, badgesCount, auraClass, soundEnabled, onStartMission, onToggleSound }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar ${auraClass}">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      <p>${badgesCount} badge${badgesCount > 1 ? 's' : ''} gagné${badgesCount > 1 ? 's' : ''}</p>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
}
```

- [ ] **Step 1: Add the import**

At the top of `src/child/ui.js`, add this as the first line (there are no existing imports in this file):

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';
```

- [ ] **Step 2: Replace `renderHome`**

Replace the function shown above with:

```js
export function renderHome(root, { childName, avatarLevel, badges, auraClass, soundEnabled, onStartMission, onToggleSound }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar ${auraClass}">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      <div class="badges-row">${renderBadgeMedallionsHtml(badges)}</div>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
}
```

Note the prop changed from `badgesCount` (a number) to `badges` (the array of earned badge ids) — `src/child/main.js` is updated to match in Task 5. `renderPairing`, `renderQuestion`, `renderResults`, and `renderConnectionError` are NOT touched by this task.

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render badge medallions on the child home screen"
```

---

### Task 4: Render medallions on the parent dashboard

**Files:**
- Modify: `src/parent/dashboard.js`

The current `renderDashboard` function is:

```js
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
        <p>Badges : ${profile.badges.join(', ') || 'aucun pour le moment'}</p>
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

At the top of `src/parent/dashboard.js`, add as the first line:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';
```

- [ ] **Step 2: Replace the badges line in `renderDashboard`**

In the `progress-summary` section, replace:

```js
        <p>Badges : ${profile.badges.join(', ') || 'aucun pour le moment'}</p>
```

with:

```js
        <div class="badges-row">${renderBadgeMedallionsHtml(profile.badges)}</div>
```

`aggregateBreakdown` and everything else in the file is unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/parent/dashboard.js
git commit -m "feat: render badge medallions on the parent dashboard"
```

---

### Task 5: Update child orchestration to pass earned badges

**Files:**
- Modify: `src/child/main.js`

Find the `renderHomeScreen` function in `src/child/main.js`:

```js
function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badgesCount: profile.badges.length,
    auraClass: auraClassForLevel(profile.avatarLevel),
    soundEnabled,
    onStartMission: startMission,
    onToggleSound: toggleSound,
  });
}
```

- [ ] **Step 1: Replace `badgesCount` with `badges`**

Replace it with:

```js
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
```

Nothing else in `main.js` changes — this is the only place `renderHome` is called.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (51 tests across 10 files — 45 existing + 6 new from Task 1)

- [ ] **Step 3: Commit**

```bash
git add src/child/main.js
git commit -m "fix: pass earned badge ids to renderHome instead of a count"
```

---

### Task 6: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all 10 test files pass, 51 tests total.

- [ ] **Step 2: Start the dev server and check both screens**

Run: `npm run dev`. Open `http://localhost:5173/` (child, already paired from prior testing) and `http://localhost:5173/parent.html` (parent, already logged in from prior testing).

- [ ] **Step 3: Verify the child home screen**

Confirm the 3 medallions appear in place of the old "X badges gagnés" text: colored with the correct emoji for any badge already in `profile.badges` (from prior testing), grayed out with a 🔒 for the rest. Hovering over a medallion should show its label as a tooltip (native `title` attribute).

- [ ] **Step 4: Verify the parent dashboard**

Confirm the same 3 medallions appear in place of the old comma-joined badge list, with the same earned/locked states as the child screen (both read from the same `profile.badges` field in Firestore, so they must match).

- [ ] **Step 5: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-4 against the live URL (remember to fully close/reopen the tab once, per the service worker's network-first navigation strategy, to pick up the new deploy).
