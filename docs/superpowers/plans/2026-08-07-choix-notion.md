# Choix de notion par l'enfant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the child pick a single notion from the home screen and get a mission entirely made of that notion, instead of the usual mixed mission.

**Architecture:** `src/child/questions.js` exports `QUESTION_TYPES` (the canonical list of known notion ids, derived from `GENERATORS`) and a new `generateSingleTypeMission(count, type, level)` generator. `src/child/ui.js` gains a new screen `renderNotionPicker` and a second button on the home screen. `src/child/main.js` wires it all together: `startMission` gains an optional `notionType` parameter, defaulting to the existing mixed-mission behavior when omitted.

**Tech Stack:** Vite + vanilla JavaScript, Vitest (TDD), Firebase Hosting for deployment.

---

### Task CN-1: QUESTION_TYPES export and generateSingleTypeMission (TDD)

**Files:**
- Modify: `src/child/questions.js`
- Test: `tests/child/questions.test.js`

- [ ] **Step 1: Write the failing tests**

In `tests/child/questions.test.js`, update the import block at the top to add `generateSingleTypeMission` and `QUESTION_TYPES`:

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
  generateSingleTypeMission,
  generateMission,
  QUESTION_TYPES,
} from '../../src/child/questions.js';
import { SHAPES, shapeSides } from '../../src/child/shapes.js';
import { COINS } from '../../src/child/money.js';
import { formatTime } from '../../src/child/clock.js';
```

Add these new `describe` blocks at the very end of the file (after the existing `describe('generateMission with a focusType', ...)` block):

```js
describe('QUESTION_TYPES', () => {
  it('matches the registered generator keys exactly', () => {
    expect(QUESTION_TYPES).toEqual([
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

describe('generateSingleTypeMission', () => {
  it('returns exactly `count` questions, all of the requested type', () => {
    const mission = generateSingleTypeMission(6, 'geometrie');
    expect(mission).toHaveLength(6);
    mission.forEach((q) => expect(q.type).toBe('geometrie'));
  });

  it('passes the level through to the underlying generator', () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateSingleTypeMission(1, 'multiplication', 3);
      tablesSeen.push(mission[0].a);
    }
    // Level 3 multiplication can use tables 3, 4, 6, 7, 8, 9 — none of which level 1 ever produces.
    expect(tablesSeen.some((table) => [3, 4, 6, 7, 8, 9].includes(table))).toBe(true);
  });

  it('falls back to addition for an unknown type', () => {
    const mission = generateSingleTypeMission(3, 'not-a-real-type');
    mission.forEach((q) => expect(q.type).toBe('addition'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- questions`
Expected: FAIL with "generateSingleTypeMission is not defined" / "QUESTION_TYPES is not defined".

- [ ] **Step 3: Implement `QUESTION_TYPES` and `generateSingleTypeMission`**

In `src/child/questions.js`, add this code right after the `GENERATORS` object definition and before `const FOCUS_RATIO = 0.7;`:

```js
export const QUESTION_TYPES = Object.keys(GENERATORS);

export function generateSingleTypeMission(count, type, level = 1) {
  const generator = GENERATORS[type] ?? GENERATORS.addition;
  return Array.from({ length: count }, () => generator(level));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- questions`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add QUESTION_TYPES export and generateSingleTypeMission (TDD)"
```

---

### Task CN-2: Notion picker screen and home screen button

**Files:**
- Modify: `src/child/ui.js`

- [ ] **Step 1: Add `renderNotionPicker`**

In `src/child/ui.js`, add this new exported function right after `renderPairing` and before the `FOCUS_LABELS` constant:

```js
export function renderNotionPicker(root, { types, onSelect, onBack }) {
  root.innerHTML = `
    <div class="screen notion-picker-screen">
      <h1>Choisis une notion</h1>
      ${types
        .map((type) => `<button class="big-button notion-btn" data-type="${type}">${emojiForType(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}</button>`)
        .join('')}
      <button id="notion-picker-back" class="big-button">Retour</button>
    </div>
  `;
  root.querySelectorAll('.notion-btn').forEach((btn) =>
    btn.addEventListener('click', () => onSelect(btn.dataset.type))
  );
  root.querySelector('#notion-picker-back').addEventListener('click', onBack);
}
```

This reuses the existing `.big-button` CSS class (already `width: 100%`, stackable) — no new CSS needed.

- [ ] **Step 2: Add the "Choisir une notion" button to `renderHome`**

In `src/child/ui.js`, update `renderHome`'s signature and template. Replace:

```js
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
```

with:

```js
export function renderHome(root, { childName, avatarLevel, badges, auraClass, characterEmoji, accessoryEmoji, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize, onChooseNotion }) {
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
      <button id="choose-notion" class="big-button">🎯 Choisir une notion</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Ambre';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
  root.querySelector('#choose-notion').addEventListener('click', onChooseNotion);
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (`ui.js` has no dedicated tests, per project convention — this is a smoke check).

- [ ] **Step 4: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: add the notion picker screen and a home screen button to open it"
```

---

### Task CN-3: Wire notion picking into child orchestration

**Files:**
- Modify: `src/child/main.js`

**Important — a real bug to avoid:** `renderHome`'s `#start-mission` button is wired as `root.querySelector('#start-mission').addEventListener('click', onStartMission)` (see `ui.js`, unchanged by Task CN-2). A native DOM click event handler always receives the `Event` object as its first argument. Today `startMission()` takes no parameters, so that stray argument is silently ignored. Once `startMission` gains a `notionType` parameter (this task), passing `startMission` directly as `onStartMission` would make the "✨ Mission du jour" button call `startMission(clickEvent)` — a truthy, non-null value — which would wrongly route the regular mixed mission through the single-type path. **Step 2 below wraps the reference (`() => startMission()`) specifically to prevent this.** Do not simplify it back to a bare `startMission` reference.

- [ ] **Step 1: Update imports**

In `src/child/main.js`, replace:

```js
import { generateMission } from './questions.js';
```

with:

```js
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
```

Replace:

```js
import { renderPairing, renderHome, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderConnectionError } from './ui.js';
```

with:

```js
import { renderPairing, renderHome, renderNotionPicker, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderConnectionError } from './ui.js';
```

- [ ] **Step 2: Add `showNotionPicker` and wire it into `renderHomeScreen`**

Replace:

```js
function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    characterEmoji: emojiForCharacter(profile.selectedCharacter ?? DEFAULT_CHARACTER),
    accessoryEmoji: emojiForAccessory(profile.selectedAccessory ?? DEFAULT_ACCESSORY),
    soundEnabled,
    focusType: profile.focusType ?? null,
    onStartMission: startMission,
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
  });
}
```

with:

```js
function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    characterEmoji: emojiForCharacter(profile.selectedCharacter ?? DEFAULT_CHARACTER),
    accessoryEmoji: emojiForAccessory(profile.selectedAccessory ?? DEFAULT_ACCESSORY),
    soundEnabled,
    focusType: profile.focusType ?? null,
    onStartMission: () => startMission(),
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
    onChooseNotion: showNotionPicker,
  });
}

function showNotionPicker() {
  renderNotionPicker(root, {
    types: QUESTION_TYPES,
    onSelect: startMission,
    onBack: () => renderHomeScreen(lastProfile),
  });
}
```

- [ ] **Step 3: Give `startMission` an optional `notionType` parameter**

Replace:

```js
function startMission() {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  session = createSession(generateMission(MISSION_LENGTH, difficultyLevels, lastProfile?.focusType ?? null));
  lastFeedback = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}
```

with:

```js
function startMission(notionType = null) {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  const questions = notionType
    ? generateSingleTypeMission(MISSION_LENGTH, notionType, difficultyLevels[notionType] ?? 1)
    : generateMission(MISSION_LENGTH, difficultyLevels, lastProfile?.focusType ?? null);
  session = createSession(questions);
  lastFeedback = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}
```

Note that `onSelect: startMission` in `showNotionPicker` (Step 2) is safe as a bare reference: `renderNotionPicker`'s own click handler calls `onSelect(btn.dataset.type)` explicitly (see `ui.js`), not a raw DOM event, so `startMission` correctly receives the notion type string as `notionType`.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS (`main.js` has no dedicated tests, per project convention — this is a smoke check).

- [ ] **Step 5: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire the notion picker into child orchestration"
```

---

### Task CN-4: Manual verification and deploy

**Files:** None (verification and deployment task)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all test files green.

- [ ] **Step 2: Manual verification (if the user is available to pair)**

If the user can log in and enter the child PIN themselves, verify on `npm run dev`:
- The home screen shows a new "🎯 Choisir une notion" button below "✨ Mission du jour".
- Tapping it shows a list of all 11 notions (emoji + name) plus a "Retour" button.
- "Retour" goes back to the home screen without starting a mission.
- Picking a notion (e.g. "Géométrie") starts a 10-question mission where every question is that notion.
- "✨ Mission du jour" still produces the usual mixed mission (regression check for the click-event-argument fix in Task CN-3).
- The mission format (quiz/QCM/chasse aux paires) still varies normally for a single-notion mission.
- Difficulty adaptation and mastery badges still work normally after a single-notion mission.

If manual verification isn't possible this session (no PIN/password entry), rely on the test suite and code review, consistent with how every prior sub-project in this series was verified.

- [ ] **Step 3: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: Build succeeds, deploy succeeds, and the live URL (https://missions-de-luna.web.app) serves the updated bundle.

- [ ] **Step 4: Commit any final fixes discovered during verification**

Only if verification in Step 2 surfaced an issue — commit the fix with a `fix:` prefixed message before re-running Steps 1 and 3.
