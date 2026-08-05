# Personnalisation de l'avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the child unlock and select alternate avatar characters (level-based) and accessories (badge-based), replacing the fixed 🦄, with automatic unlocking and no separate currency.

**Architecture:** A new pure, shared catalog module (`src/shared/avatarCustomization.js`) owns the character/accessory definitions and all unlock/lookup logic. `src/child/ui.js` gains a new `renderCustomize` screen and an updated `renderHome` that displays the selected character+accessory instead of the hardcoded unicorn. `src/child/main.js` wires a new "Personnaliser" screen into the existing home→mission flow, persisting the child's selection to the same Firestore profile document used by everything else.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Avatar customization catalog (TDD)

**Files:**
- Create: `src/shared/avatarCustomization.js`
- Test: `tests/shared/avatarCustomization.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/avatarCustomization.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  ACCESSORIES,
  DEFAULT_CHARACTER,
  DEFAULT_ACCESSORY,
  unlockedCharacters,
  unlockedAccessories,
  characterMedallionData,
  accessoryMedallionData,
  emojiForCharacter,
  emojiForAccessory,
} from '../../src/shared/avatarCustomization.js';

describe('CHARACTERS', () => {
  it('defines 3 characters with the unicorn unlocked from level 1', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'panda']);
    expect(CHARACTERS.find((c) => c.id === 'unicorn').requiredLevel).toBe(1);
  });
});

describe('ACCESSORIES', () => {
  it('defines 3 accessories with badge-based unlock conditions', () => {
    expect(ACCESSORIES.map((a) => a.id)).toEqual(['crown', 'star', 'flower']);
    expect(ACCESSORIES.find((a) => a.id === 'crown').requiresAnyOf).toEqual(['streak-30']);
    expect(ACCESSORIES.find((a) => a.id === 'flower').requiresAnyOf).toEqual(['perfect-10']);
  });

  it('unlocks the star with any of the 6 mastery badges', () => {
    const star = ACCESSORIES.find((a) => a.id === 'star');
    expect(star.requiresAnyOf).toEqual([
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
      'mastery-division',
      'mastery-fraction',
    ]);
  });
});

describe('DEFAULT_CHARACTER and DEFAULT_ACCESSORY', () => {
  it('defaults to the unicorn and no accessory', () => {
    expect(DEFAULT_CHARACTER).toBe('unicorn');
    expect(DEFAULT_ACCESSORY).toBe(null);
  });
});

describe('unlockedCharacters', () => {
  it('only the unicorn is unlocked at level 1', () => {
    expect(unlockedCharacters(1).map((c) => c.id)).toEqual(['unicorn']);
  });

  it('unlocks the butterfly at level 3', () => {
    expect(unlockedCharacters(3).map((c) => c.id)).toEqual(['unicorn', 'butterfly']);
  });

  it('unlocks the panda at level 5', () => {
    expect(unlockedCharacters(5).map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'panda']);
  });

  it('never returns duplicates or drops the unicorn at high levels', () => {
    const result = unlockedCharacters(9);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.id)).toContain('unicorn');
  });
});

describe('unlockedAccessories', () => {
  it('returns an empty list when no relevant badge is present', () => {
    expect(unlockedAccessories([])).toEqual([]);
    expect(unlockedAccessories(['streak-3'])).toEqual([]);
  });

  it('unlocks the crown with streak-30', () => {
    expect(unlockedAccessories(['streak-30']).map((a) => a.id)).toEqual(['crown']);
  });

  it('unlocks the star with any single mastery badge', () => {
    expect(unlockedAccessories(['mastery-division']).map((a) => a.id)).toEqual(['star']);
  });

  it('unlocks the flower with perfect-10', () => {
    expect(unlockedAccessories(['perfect-10']).map((a) => a.id)).toEqual(['flower']);
  });

  it('unlocks multiple accessories at once when multiple badges are present', () => {
    const result = unlockedAccessories(['streak-30', 'mastery-fraction', 'perfect-10']);
    expect(result.map((a) => a.id)).toEqual(['crown', 'star', 'flower']);
  });
});

describe('characterMedallionData', () => {
  it('marks only the unicorn as unlocked at level 1', () => {
    const result = characterMedallionData(1);
    expect(result).toHaveLength(3);
    expect(result.find((c) => c.id === 'unicorn').unlocked).toBe(true);
    expect(result.find((c) => c.id === 'butterfly').unlocked).toBe(false);
    expect(result.find((c) => c.id === 'panda').unlocked).toBe(false);
  });

  it('marks the butterfly as unlocked at level 3', () => {
    const result = characterMedallionData(3);
    expect(result.find((c) => c.id === 'butterfly').unlocked).toBe(true);
    expect(result.find((c) => c.id === 'panda').unlocked).toBe(false);
  });
});

describe('accessoryMedallionData', () => {
  it('marks no accessory as unlocked with an empty badge list', () => {
    const result = accessoryMedallionData([]);
    expect(result).toHaveLength(3);
    result.forEach((a) => expect(a.unlocked).toBe(false));
  });

  it('marks only the crown as unlocked with streak-30', () => {
    const result = accessoryMedallionData(['streak-30']);
    expect(result.find((a) => a.id === 'crown').unlocked).toBe(true);
    expect(result.find((a) => a.id === 'star').unlocked).toBe(false);
    expect(result.find((a) => a.id === 'flower').unlocked).toBe(false);
  });
});

describe('emojiForCharacter', () => {
  it('returns the emoji for a known character id', () => {
    expect(emojiForCharacter('panda')).toBe('🐼');
  });

  it('falls back to the default character for an unknown id', () => {
    expect(emojiForCharacter('unknown')).toBe('🦄');
  });
});

describe('emojiForAccessory', () => {
  it('returns the emoji for a known accessory id', () => {
    expect(emojiForAccessory('crown')).toBe('👑');
  });

  it('returns null for a null accessory id', () => {
    expect(emojiForAccessory(null)).toBe(null);
  });

  it('returns null for an unknown accessory id', () => {
    expect(emojiForAccessory('unknown')).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/avatarCustomization.test.js`
Expected: FAIL — cannot find module `../../src/shared/avatarCustomization.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/avatarCustomization.js`:

```js
export const CHARACTERS = [
  { id: 'unicorn', emoji: '🦄', requiredLevel: 1 },
  { id: 'butterfly', emoji: '🦋', requiredLevel: 3 },
  { id: 'panda', emoji: '🐼', requiredLevel: 5 },
];

const MASTERY_BADGE_IDS = [
  'mastery-addition',
  'mastery-soustraction',
  'mastery-multiplication',
  'mastery-comparaison',
  'mastery-division',
  'mastery-fraction',
];

export const ACCESSORIES = [
  { id: 'crown', emoji: '👑', requiresAnyOf: ['streak-30'] },
  { id: 'star', emoji: '⭐', requiresAnyOf: MASTERY_BADGE_IDS },
  { id: 'flower', emoji: '🌸', requiresAnyOf: ['perfect-10'] },
];

export const DEFAULT_CHARACTER = 'unicorn';
export const DEFAULT_ACCESSORY = null;

export function unlockedCharacters(avatarLevel) {
  return CHARACTERS.filter((c) => avatarLevel >= c.requiredLevel);
}

export function unlockedAccessories(badges) {
  return ACCESSORIES.filter((a) => a.requiresAnyOf.some((id) => badges.includes(id)));
}

export function characterMedallionData(avatarLevel) {
  const unlockedIds = unlockedCharacters(avatarLevel).map((c) => c.id);
  return CHARACTERS.map((c) => ({ ...c, unlocked: unlockedIds.includes(c.id) }));
}

export function accessoryMedallionData(badges) {
  const unlockedIds = unlockedAccessories(badges).map((a) => a.id);
  return ACCESSORIES.map((a) => ({ ...a, unlocked: unlockedIds.includes(a.id) }));
}

export function emojiForCharacter(characterId) {
  const found = CHARACTERS.find((c) => c.id === characterId);
  return found ? found.emoji : CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER).emoji;
}

export function emojiForAccessory(accessoryId) {
  if (!accessoryId) return null;
  const found = ACCESSORIES.find((a) => a.id === accessoryId);
  return found ? found.emoji : null;
}
```

Note: `characterMedallionData`/`accessoryMedallionData` extend the approved spec's `unlockedCharacters`/`unlockedAccessories` (which return only-unlocked lists) with a "full catalog + `unlocked` boolean per item" shape — needed so the customize screen can display locked items too (grayed out with a lock icon), mirroring `src/shared/badges.js`'s `badgeMedallionData` pattern. `emojiForCharacter`/`emojiForAccessory` let `main.js` resolve a stored profile id into a display emoji without `ui.js` needing to import the catalog itself.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/avatarCustomization.test.js`
Expected: PASS (22 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/avatarCustomization.js tests/shared/avatarCustomization.test.js
git commit -m "feat: add avatar character and accessory catalog with unlock logic"
```

---

### Task 2: Default character/accessory on new profiles

**Files:**
- Modify: `src/parent/family.js`

The current content of `src/parent/family.js` is:

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
    perfectMissionsCount: 0,
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

- [ ] **Step 1: Add the import and the new profile fields**

Replace the full contents of `src/parent/family.js` with:

```js
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { hashPin } from '../shared/pin.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { DEFAULT_CHARACTER, DEFAULT_ACCESSORY } from '../shared/avatarCustomization.js';

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
    perfectMissionsCount: 0,
    selectedCharacter: DEFAULT_CHARACTER,
    selectedAccessory: DEFAULT_ACCESSORY,
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
git commit -m "feat: initialize new family profiles with default character and accessory"
```

---

### Task 3: CSS for avatar overlay and customize screen

**Files:**
- Modify: `src/child/style.css`

- [ ] **Step 1: Append to the end of `src/child/style.css`**

```css
.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-accessory {
  position: absolute;
  top: -4px;
  right: -8px;
  font-size: 32px;
}

.badge-medallion.selectable {
  cursor: pointer;
  border: none;
  padding: 0;
  font-family: inherit;
  background: white;
}

.badge-medallion.selected {
  box-shadow: 0 0 0 3px #3a2f6b;
}

.customize-section-title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a6fa3;
  margin: 16px 0 4px;
  text-align: center;
}
```

`.avatar-wrapper`/`.avatar-accessory` let the accessory emoji sit as a small overlay in the corner of the character without being affected by the character's own `aura-*` drop-shadow filter (applied only to the inner `.avatar` element). `.badge-medallion.selectable`/`.selected` extend the existing `.badge-medallion`/`.locked` badge styling (unchanged) so the same visual language works for clickable, selectable character/accessory tiles on the new customize screen.

- [ ] **Step 2: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add styles for avatar accessory overlay and customize screen"
```

---

### Task 4: Home screen avatar display and customize screen render functions

**Files:**
- Modify: `src/child/ui.js`

The relevant current content of `src/child/ui.js` (`renderHome`, unchanged otherwise):

```js
export function renderHome(root, { childName, avatarLevel, badges, auraClass, soundEnabled, onStartMission, onToggleSound }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar ${auraClass}">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      ${renderBadgeMedallionsHtml(badges)}
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
}
```

- [ ] **Step 1: Replace `renderHome`**

Replace the function above with:

```js
export function renderHome(root, { childName, avatarLevel, badges, auraClass, characterEmoji, accessoryEmoji, soundEnabled, onStartMission, onToggleSound, onCustomize }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar-wrapper">
        <div class="avatar ${auraClass}">${characterEmoji}</div>
        ${accessoryEmoji ? `<span class="avatar-accessory">${accessoryEmoji}</span>` : ''}
      </div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      ${renderBadgeMedallionsHtml(badges)}
      <button id="customize" class="big-button">🎨 Personnaliser</button>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
}
```

- [ ] **Step 2: Add `renderCustomize` right after `renderHome`**

```js
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
```

`customizeMedallionHtml` is a private helper (not exported), following the same pattern as `src/shared/badges.js`'s private `medallionHtml`. `renderQuestion`, `renderQuestionQcm`, `renderPairsRound`, `renderResults`, `renderConnectionError`, and `renderPairing` are all unchanged.

No test changes for this task — consistent with the rest of the project, which doesn't unit-test HTML rendering functions (verified manually in the final task).

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass unchanged (this task adds no new tests, just new/modified UI functions).

- [ ] **Step 4: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render selected avatar and add customize screen"
```

---

### Task 5: Wire avatar customization into child orchestration

**Files:**
- Modify: `src/child/main.js`

The current content of `src/child/main.js` is:

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
    : {
        xp: 0,
        avatarLevel: 1,
        badges: [],
        streakDays: 0,
        lastSessionDate: null,
        difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
        perfectMissionsCount: 0,
      };
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
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const progressionResult = applyProgression(profileBefore, summary, nextDifficultyLevels);
  const nextProfile = {
    ...profileBefore,
    xp: progressionResult.xp,
    avatarLevel: progressionResult.avatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    perfectMissionsCount: progressionResult.perfectMissionsCount,
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
import { renderPairing, renderHome, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderConnectionError } from './ui.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from './missionMode.js';
import { generateChoices } from './choices.js';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from './pairsGame.js';
import {
  characterMedallionData,
  accessoryMedallionData,
  emojiForCharacter,
  emojiForAccessory,
  DEFAULT_CHARACTER,
  DEFAULT_ACCESSORY,
} from '../shared/avatarCustomization.js';

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
    : {
        xp: 0,
        avatarLevel: 1,
        badges: [],
        streakDays: 0,
        lastSessionDate: null,
        difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
        perfectMissionsCount: 0,
        selectedCharacter: DEFAULT_CHARACTER,
        selectedAccessory: DEFAULT_ACCESSORY,
      };
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
    characterEmoji: emojiForCharacter(profile.selectedCharacter ?? DEFAULT_CHARACTER),
    accessoryEmoji: emojiForAccessory(profile.selectedAccessory ?? DEFAULT_ACCESSORY),
    soundEnabled,
    onStartMission: startMission,
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  setSoundEnabled(soundEnabled);
  if (lastProfile) {
    renderHomeScreen(lastProfile);
  }
}

function showCustomize() {
  const profile = lastProfile;
  renderCustomize(root, {
    characters: characterMedallionData(profile.avatarLevel),
    accessories: accessoryMedallionData(profile.badges),
    selectedCharacterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    selectedAccessoryId: profile.selectedAccessory ?? DEFAULT_ACCESSORY,
    onSelectCharacter: handleSelectCharacter,
    onSelectAccessory: handleSelectAccessory,
    onBack: () => renderHomeScreen(lastProfile),
  });
}

async function handleSelectCharacter(characterId) {
  const nextProfile = { ...lastProfile, selectedCharacter: characterId };
  lastProfile = nextProfile;
  await saveProfile(familyId, nextProfile).catch(() => {});
  showCustomize();
}

async function handleSelectAccessory(accessoryId) {
  const nextProfile = { ...lastProfile, selectedAccessory: accessoryId };
  lastProfile = nextProfile;
  await saveProfile(familyId, nextProfile).catch(() => {});
  showCustomize();
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
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const progressionResult = applyProgression(profileBefore, summary, nextDifficultyLevels);
  const nextProfile = {
    ...profileBefore,
    xp: progressionResult.xp,
    avatarLevel: progressionResult.avatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    perfectMissionsCount: progressionResult.perfectMissionsCount,
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

`startMission`, `showQuestion`, `showPairsRound`, `handleAnswer`, `handlePairsMatch`, `finishMission`, `handlePairing`, `start`, the service worker registration, and the final `start()` call are unchanged from before. `showHome` is unchanged (still calls `renderHomeScreen`, which now internally resolves the character/accessory emoji). `renderHomeScreen` gains 3 new fields passed to `renderHome`. Two new functions (`showCustomize`, plus `handleSelectCharacter`/`handleSelectAccessory`) are added.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all test files green (120 existing + 22 new in Task 1 = 142 tests total)

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: builds without errors

- [ ] **Step 4: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire avatar customization into child app orchestration"
```

---

### Task 6: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, 142 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing).

- [ ] **Step 3: Verify the home screen shows the unicorn by default**

Confirm a fresh/existing profile without a stored `selectedCharacter` shows 🦄 with no accessory overlay, and the aura still applies based on level exactly as before.

- [ ] **Step 4: Verify the customize screen**

Tap "🎨 Personnaliser". Confirm the unicorn is shown unlocked and selectable (with a visible "selected" ring), the butterfly and panda are shown locked (grayed, 🔒) unless the profile's level already qualifies, and all 3 accessories are shown locked unless the relevant badge is already earned. Tap "Retour" and confirm it returns to the home screen unchanged.

- [ ] **Step 5: Verify selection persists**

Select the unicorn again (or, if a second character/accessory happens to already be unlocked on the test profile, select it) — confirm the home screen's avatar updates immediately and the selection is still there after reloading the page (closing/reopening the tab).

- [ ] **Step 6: Verify unlocking**

Play missions until the profile's `avatarLevel` reaches 3 (butterfly) and/or a relevant badge is earned (crown/star/flower) — confirm the customize screen updates to show the newly-unlocked item as selectable instead of locked.

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-4 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
