# Français — accord singulier/pluriel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first French-language notion ("accord-pluriel") to "Missions d'Ambre", in a mission track kept fully separate from the 11 existing math notions.

**Architecture:** A new pure module `src/child/frenchQuestions.js` mirrors the shape of `src/child/questions.js` but with its own independent generator registry (`FRENCH_GENERATORS`) and mission composer (`generateFrenchMission`), so a French question can never end up in a math mission or vice versa. A new home-screen button and a new `startFrenchMission` orchestration function in `main.js` reuse every existing piece of session/mission machinery (`createSession`, `pickMissionMode`, `createPairsRound`, `showQuestion`, `showPairsRound`, `finishMission`) unchanged — only question *generation* differs between the two tracks. All other integration points (difficulty, progression, badges, help text) follow the exact "append new type" pattern already used for every math notion, since the parent dashboard's reporting is already fully generic. The parent's revision-priority selector (`NOTION_TYPES`) is deliberately **not** extended — that mechanism only affects math missions.

**Tech Stack:** Vite + vanilla JavaScript, Vitest (TDD), Firebase Hosting for deployment.

---

### Task FR-1: French word bank, generator, and mission composer (TDD)

**Files:**
- Create: `src/child/frenchQuestions.js`
- Test: `tests/child/frenchQuestions.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/child/frenchQuestions.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  REGULAR_WORDS,
  X_PLURAL_WORDS,
  INVARIABLE_WORDS,
  generateAccordPluriel,
  FRENCH_TYPES,
  generateFrenchMission,
} from '../../src/child/frenchQuestions.js';

describe('generateAccordPluriel', () => {
  it('only uses regular words at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel();
      const knownForms = REGULAR_WORDS.flatMap((w) => [w.singular, w.plural]);
      expect(knownForms).toContain(q.given);
    }
  });

  it('adds -x plural words at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel(2);
      const knownForms = [...REGULAR_WORDS, ...X_PLURAL_WORDS].flatMap((w) => [w.singular, w.plural]);
      expect(knownForms).toContain(q.given);
    }
  });

  it('adds invariable words at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel(3);
      const knownForms = [...REGULAR_WORDS, ...X_PLURAL_WORDS, ...INVARIABLE_WORDS].flatMap((w) => [w.singular, w.plural]);
      expect(knownForms).toContain(q.given);
    }
  });

  it('always has type "accord-pluriel"', () => {
    expect(generateAccordPluriel().type).toBe('accord-pluriel');
  });

  it('answers with the real opposite form of the given word', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel(3);
      const words = [...REGULAR_WORDS, ...X_PLURAL_WORDS, ...INVARIABLE_WORDS];
      const match = words.find((w) => w.singular === q.given || w.plural === q.given);
      const expectedAnswer = q.given === match.singular ? match.plural : match.singular;
      expect(q.answer).toBe(expectedAnswer);
    }
  });

  it('includes the correct answer among 3 unique options', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel(3);
      expect(q.options).toHaveLength(3);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
    }
  });

  it('asks either for the plural or the singular form in the prompt', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateAccordPluriel();
      expect(q.prompt).toMatch(/pluriel|singulier/);
    }
  });
});

describe('FRENCH_TYPES', () => {
  it('lists exactly the registered French generator keys', () => {
    expect(FRENCH_TYPES).toEqual(['accord-pluriel']);
  });
});

describe('generateFrenchMission', () => {
  it('returns the requested number of questions, all of known French types', () => {
    const mission = generateFrenchMission(10);
    expect(mission).toHaveLength(10);
    mission.forEach((q) => expect(FRENCH_TYPES).toContain(q.type));
  });

  it('passes the difficulty level through to the underlying generator', () => {
    let sawInvariable = false;
    for (let i = 0; i < 30; i++) {
      const mission = generateFrenchMission(1, { 'accord-pluriel': 3 });
      const knownForms = INVARIABLE_WORDS.flatMap((w) => [w.singular, w.plural]);
      if (knownForms.includes(mission[0].given)) sawInvariable = true;
    }
    // Level 3 has a 4-in-16 chance of an invariable word per draw; over 30 draws the
    // chance of never seeing one is astronomically small, so this reliably proves the
    // level was passed through (same statistical pattern used elsewhere in this project).
    expect(sawInvariable).toBe(true);
  });

  it('defaults to level 1 (regular words only) when no difficulty level is provided for a type', () => {
    const mission = generateFrenchMission(10, {});
    const regularForms = REGULAR_WORDS.flatMap((w) => [w.singular, w.plural]);
    mission.forEach((q) => expect(regularForms).toContain(q.given));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- frenchQuestions`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create `src/child/frenchQuestions.js`**

```js
import { randomInt, shuffle } from './random.js';

export const REGULAR_WORDS = [
  { singular: 'un chat', plural: 'des chats' },
  { singular: 'une table', plural: 'des tables' },
  { singular: 'un livre', plural: 'des livres' },
  { singular: 'une fleur', plural: 'des fleurs' },
  { singular: 'un ami', plural: 'des amis' },
  { singular: 'une pomme', plural: 'des pommes' },
];

export const X_PLURAL_WORDS = [
  { singular: 'un cheval', plural: 'des chevaux' },
  { singular: 'un chou', plural: 'des choux' },
  { singular: 'un oiseau', plural: 'des oiseaux' },
  { singular: 'un bijou', plural: 'des bijoux' },
  { singular: 'un jeu', plural: 'des jeux' },
  { singular: 'un genou', plural: 'des genoux' },
];

export const INVARIABLE_WORDS = [
  { singular: 'une souris', plural: 'des souris' },
  { singular: 'un nez', plural: 'des nez' },
  { singular: 'une croix', plural: 'des croix' },
  { singular: 'un tapis', plural: 'des tapis' },
];

const WORDS_BY_LEVEL = {
  1: REGULAR_WORDS,
  2: [...REGULAR_WORDS, ...X_PLURAL_WORDS],
  3: [...REGULAR_WORDS, ...X_PLURAL_WORDS, ...INVARIABLE_WORDS],
};

export function generateAccordPluriel(level = 1) {
  const words = WORDS_BY_LEVEL[level] ?? WORDS_BY_LEVEL[1];
  const word = words[randomInt(0, words.length - 1)];
  const askPlural = randomInt(0, 1) === 0;
  const given = askPlural ? word.singular : word.plural;
  const answer = askPlural ? word.plural : word.singular;
  const prompt = askPlural
    ? `Quel est le pluriel de "${given}" ?`
    : `Quel est le singulier de "${given}" ?`;
  const distractors = new Set();
  while (distractors.size < 2) {
    const other = words[randomInt(0, words.length - 1)];
    const candidate = askPlural ? other.plural : other.singular;
    if (candidate !== answer) distractors.add(candidate);
  }
  return {
    type: 'accord-pluriel',
    given,
    answer,
    prompt,
    options: shuffle([answer, ...distractors]),
  };
}

const FRENCH_GENERATORS = {
  'accord-pluriel': generateAccordPluriel,
};

export const FRENCH_TYPES = Object.keys(FRENCH_GENERATORS);

export function generateFrenchMission(count = 10, difficultyLevels = {}) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = FRENCH_TYPES[i % FRENCH_TYPES.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(FRENCH_GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- frenchQuestions`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/frenchQuestions.js tests/child/frenchQuestions.test.js
git commit -m "feat: add French word bank, generateAccordPluriel, and generateFrenchMission (TDD)"
```

---

### Task FR-2: Session breakdown entry for accord-pluriel (TDD)

**Files:**
- Modify: `src/child/session.js:1-21`
- Test: `tests/child/session.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/child/session.test.js`, add after the `'initializes a breakdown entry for probleme'` test (still inside `describe('session flow', ...)`):

```js
  it('initializes a breakdown entry for accord-pluriel', () => {
    const session = createSession([]);
    expect(session.breakdown['accord-pluriel']).toEqual({ correct: 0, total: 0 });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session`
Expected: FAIL — `session.breakdown['accord-pluriel']` is `undefined`.

- [ ] **Step 3: Add the breakdown entry**

In `src/child/session.js`, inside `createSession`'s `breakdown` object, add after `probleme: { correct: 0, total: 0 },`:

```js
      'accord-pluriel': { correct: 0, total: 0 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: add session breakdown entry for accord-pluriel (TDD)"
```

---

### Task FR-3: Default difficulty level for accord-pluriel (TDD)

**Files:**
- Modify: `src/shared/difficulty.js:6-18`
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
      'accord-pluriel': 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- difficulty`
Expected: FAIL — the object is missing the `accord-pluriel` key.

- [ ] **Step 3: Update `DEFAULT_DIFFICULTY_LEVELS`**

In `src/shared/difficulty.js`, add after `probleme: 1,`:

```js
  'accord-pluriel': 1,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- difficulty`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/difficulty.js tests/shared/difficulty.test.js
git commit -m "feat: add default difficulty level for accord-pluriel (TDD)"
```

---

### Task FR-4: Mastery detection for accord-pluriel (TDD)

**Files:**
- Modify: `src/shared/progression.js:6`
- Test: `tests/shared/progression.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/progression.test.js`, add after the `'detects mastery for the new probleme type too'` test (still inside `describe('newlyMasteredTypes', ...)`):

```js
  it('detects mastery for the new accord-pluriel type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 1, longueur: 1, temps: 1, probleme: 1, 'accord-pluriel': 2 };
    const next = { ...previous, 'accord-pluriel': 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['accord-pluriel']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- progression`
Expected: FAIL — `newlyMasteredTypes` returns `[]` since `accord-pluriel` isn't in `OPERATION_TYPES` yet.

- [ ] **Step 3: Update `OPERATION_TYPES`**

In `src/shared/progression.js`, line 6, replace:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme'];
```

with:

```js
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme', 'accord-pluriel'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- progression`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: detect mastery for accord-pluriel (TDD)"
```

---

### Task FR-5: Mastery badge for accord-pluriel (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Test: `tests/shared/badges.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/badges.test.js`, update the `'defines all 17 badges...'` test's expected id list and rename it:

```js
  it('defines all 18 badges with a category, in a fixed order', () => {
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
      'mastery-accord-pluriel',
      'perfect-1',
      'perfect-10',
      'perfect-50',
    ]);
  });
```

Update the `toHaveLength(17)` call in `describe('badgeMedallionData', ...)` (in the `'marks badges as earned when their id is present'` test) to `toHaveLength(18)`.

Add after the last existing test inside `describe('renderBadgeMedallionsHtml', ...)`:

```js
  it('renders the accord-pluriel mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-accord-pluriel']);
    expect(html).toContain('🔤');
  });
```

Update `describe('emojiForType', ...)`'s first test:

```js
  it('returns the correct emoji for each of the 12 mastery types', () => {
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
    expect(emojiForType('accord-pluriel')).toBe('🔤');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- badges`
Expected: FAIL — `mastery-accord-pluriel` doesn't exist yet.

- [ ] **Step 3: Add the new badge**

In `src/shared/badges.js`, add to `BADGES` after the `mastery-probleme` entry and before `perfect-1`:

```js
  { id: 'mastery-accord-pluriel', category: 'maitrise', emoji: '🔤', label: 'Accord pluriel maîtrisé', gradient: ['#2e7d32', '#66bb6a'] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- badges`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add mastery-accord-pluriel badge (TDD)"
```

**Note for the code-quality reviewer:** explicitly re-verify that `['#2e7d32', '#66bb6a']` (deep forest green) doesn't visually collide with any of the 17 existing badge gradients — in particular `mastery-addition` (`['#a8e6cf', '#dcedc1']`, pastel mint green) and `perfect-50` (`['#84fab0', '#8fd3f4']`, pastel mint-to-cyan), the closest in hue family. This is the same check that caught real collisions in earlier sub-projects — adjust the color if it reads as a near-duplicate.

---

### Task FR-6: Help text for accord-pluriel (TDD)

**Files:**
- Modify: `src/shared/helpContent.js`
- Test: `tests/shared/helpContent.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/shared/helpContent.test.js`, update the expected key list:

```js
describe('HELP_TEXT', () => {
  it('defines a help text for each of the 12 question types, in a fixed order', () => {
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
      'accord-pluriel',
    ]);
  });
});
```

(`helpTextForType`'s test already iterates `Object.keys(HELP_TEXT)` generically, so it covers the new entry with no change needed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- helpContent`
Expected: FAIL — the `accord-pluriel` key is missing.

- [ ] **Step 3: Add the help text**

In `src/shared/helpContent.js`, add to `HELP_TEXT` after the `probleme` entry:

```js
  'accord-pluriel':
    "Pour former le pluriel, ajoute généralement un -s au mot. Attention : certains mots prennent un -x (chevaux, choux, oiseaux...), et d'autres ne changent pas du tout (une souris, des souris).",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- helpContent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/helpContent.js tests/shared/helpContent.test.js
git commit -m "feat: add generic help text for accord-pluriel (TDD)"
```

---

### Task FR-7: "Mission Français" button on the home screen

**Files:**
- Modify: `src/child/ui.js`

- [ ] **Step 1: Add the button and the `onStartFrenchMission` prop**

In `src/child/ui.js`, replace `renderHome`'s signature and template:

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

with:

```js
export function renderHome(root, { childName, avatarLevel, badges, auraClass, characterEmoji, accessoryEmoji, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize, onChooseNotion, onStartFrenchMission }) {
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
      <button id="start-french-mission" class="big-button">📚 Mission Français</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Ambre';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
  root.querySelector('#choose-notion').addEventListener('click', onChooseNotion);
  root.querySelector('#start-french-mission').addEventListener('click', onStartFrenchMission);
}
```

**Important — the same click-event-argument trap as before:** `onStartFrenchMission` will be wired via `addEventListener('click', onStartFrenchMission)`, so it always receives the DOM click `Event` as its first argument. Task FR-8 must pass a wrapped reference (`() => startFrenchMission()`), never a bare `startFrenchMission` — `startFrenchMission` itself takes no parameters in this plan, but wrapping keeps the pattern consistent and safe against future signature changes.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS (`ui.js` has no dedicated tests, per project convention — this is a smoke check).

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: add the Mission Francais button to the home screen"
```

---

### Task FR-8: Wire startFrenchMission into child orchestration

**Files:**
- Modify: `src/child/main.js`

- [ ] **Step 1: Update imports**

In `src/child/main.js`, replace:

```js
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
```

with:

```js
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
import { generateFrenchMission } from './frenchQuestions.js';
```

- [ ] **Step 2: Add `startFrenchMission` and wire it into `renderHomeScreen`**

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
    onStartMission: () => startMission(),
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
    onChooseNotion: showNotionPicker,
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
    onStartFrenchMission: () => startFrenchMission(),
  });
}
```

- [ ] **Step 3: Add the `startFrenchMission` function**

Add this function right after `startMission` (which ends with the closing `}` before `function choicesForCurrentQuestion`):

```js
function startFrenchMission() {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  session = createSession(generateFrenchMission(MISSION_LENGTH, difficultyLevels));
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

This deliberately duplicates `startMission`'s body except for the question-generation line — `startMission` can't be reused directly because it also handles the math-only `notionType` parameter, and merging the two would tangle the math and French code paths together, working against the "always separate" requirement.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS (`main.js` has no dedicated tests, per project convention — this is a smoke check).

- [ ] **Step 5: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire startFrenchMission into child orchestration"
```

---

### Task FR-9: Manual verification and deploy

**Files:** None (verification and deployment task)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all test files green.

- [ ] **Step 2: Manual verification (if the user is available to pair)**

If the user can log in and enter the child PIN themselves, verify on `npm run dev`:
- The home screen shows a new "📚 Mission Français" button.
- Tapping it starts a 10-question mission entirely made of "accord-pluriel" questions — never mixed with math questions.
- The mission works in all 3 formats (quiz classique, QCM, chasse aux paires) exactly like a math mission.
- The "❓ Aide" button shows the accord-pluriel help text.
- After finishing a French mission, XP/level/streak/badges update normally, and the parent dashboard shows "accord-pluriel" in "Réussite par notion" and the weekly heat-map.
- The parent's "Priorité de révision" dropdown does **not** show "accord-pluriel" (deliberate scoping — confirm this is not a bug).
- "✨ Mission du jour" and "🎯 Choisir une notion" still work exactly as before (regression check).

If manual verification isn't possible this session (no PIN/password entry), rely on the test suite and code review, consistent with how every prior sub-project in this series was verified.

- [ ] **Step 3: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: Build succeeds, deploy succeeds, and the live URL (https://missions-de-luna.web.app) serves the updated bundle.

- [ ] **Step 4: Commit any final fixes discovered during verification**

Only if verification in Step 2 surfaced an issue — commit the fix with a `fix:` prefixed message before re-running Steps 1 and 3.
