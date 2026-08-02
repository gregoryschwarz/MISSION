# Retour Sensoriel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sensory feedback (generated sounds, feedback "pop" animation, level-based avatar aura, results-screen confetti) to the already-deployed "Missions de Luna" child app, with no changes to game logic, Firestore schema, or security rules.

**Architecture:** Two new pure/testable modules (`src/child/sound.js` for Web Audio API tone generation + a localStorage-backed mute setting, `src/child/avatar.js` for a pure level→CSS-class mapping), CSS-only animations added to `src/child/style.css`, and small, additive changes to the existing `src/child/ui.js` render functions and `src/child/main.js` orchestration to wire it all together.

**Tech Stack:** Vanilla JavaScript, Web Audio API, CSS `@keyframes`, Vitest.

---

### Task 1: Sound module (TDD)

**Files:**
- Create: `src/child/sound.js`
- Test: `tests/child/sound.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/sound.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { isSoundEnabled, setSoundEnabled } from '../../src/child/sound.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('isSoundEnabled', () => {
  it('defaults to true when nothing is stored', () => {
    const storage = createFakeStorage();
    expect(isSoundEnabled(storage)).toBe(true);
  });

  it('returns false after being explicitly disabled', () => {
    const storage = createFakeStorage();
    setSoundEnabled(false, storage);
    expect(isSoundEnabled(storage)).toBe(false);
  });

  it('returns true after being explicitly re-enabled', () => {
    const storage = createFakeStorage();
    setSoundEnabled(false, storage);
    setSoundEnabled(true, storage);
    expect(isSoundEnabled(storage)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/sound.test.js`
Expected: FAIL — cannot find module `../../src/child/sound.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/sound.js`:

```js
const STORAGE_KEY = 'missionsDeLuna.soundEnabled';

export function isSoundEnabled(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? true : raw === 'true';
}

export function setSoundEnabled(enabled, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, String(enabled));
}

function playTone(frequency, durationMs, type = 'sine') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    // Sound is a nice-to-have; never let it break gameplay.
  }
}

export function playCorrectSound() {
  playTone(880, 150);
  setTimeout(() => playTone(1174, 150), 100);
}

export function playIncorrectSound() {
  playTone(220, 200);
}

export function playMissionCompleteSound() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 180), i * 120);
  });
}

export function playLevelUpSound() {
  [784, 988, 1175, 1568].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 220), i * 100);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/sound.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/sound.js tests/child/sound.test.js
git commit -m "feat: add sound module (Web Audio tones + mute setting)"
```

---

### Task 2: Avatar aura logic (TDD)

**Files:**
- Create: `src/child/avatar.js`
- Test: `tests/child/avatar.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/avatar.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { auraClassForLevel } from '../../src/child/avatar.js';

describe('auraClassForLevel', () => {
  it('returns aura-1 for level 1', () => {
    expect(auraClassForLevel(1)).toBe('aura-1');
  });

  it('returns aura-2 for level 2', () => {
    expect(auraClassForLevel(2)).toBe('aura-2');
  });

  it('returns aura-3 for level 3', () => {
    expect(auraClassForLevel(3)).toBe('aura-3');
  });

  it('returns aura-4 for level 4', () => {
    expect(auraClassForLevel(4)).toBe('aura-4');
  });

  it('returns aura-5 for level 5 and above', () => {
    expect(auraClassForLevel(5)).toBe('aura-5');
    expect(auraClassForLevel(9)).toBe('aura-5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/avatar.test.js`
Expected: FAIL — cannot find module `../../src/child/avatar.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/avatar.js`:

```js
export function auraClassForLevel(avatarLevel) {
  if (avatarLevel >= 5) return 'aura-5';
  if (avatarLevel >= 4) return 'aura-4';
  if (avatarLevel >= 3) return 'aura-3';
  if (avatarLevel >= 2) return 'aura-2';
  return 'aura-1';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/avatar.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/avatar.js tests/child/avatar.test.js
git commit -m "feat: add level-to-aura-class mapping for the avatar"
```

---

### Task 3: CSS animations and aura styles

**Files:**
- Modify: `src/child/style.css`

The current file (as of this plan) is:

```css
:root {
  color-scheme: light;
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, #ffe6fb, #e9defc);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen {
  width: min(90vw, 480px);
  text-align: center;
  padding: 24px;
}

.avatar {
  font-size: 96px;
}

.big-button {
  font-size: 20px;
  padding: 16px 24px;
  border-radius: 24px;
  border: none;
  background: #c9b8ff;
  color: #3a2f6b;
  cursor: pointer;
  width: 100%;
  margin-top: 12px;
}

.big-button:active {
  transform: scale(0.97);
}

.options {
  display: flex;
  gap: 12px;
}

input {
  font-size: 20px;
  padding: 10px;
  border-radius: 12px;
  border: 2px solid #c9b8ff;
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0;
}

.feedback.correct {
  color: #2e7d32;
  font-weight: bold;
}

.feedback.incorrect {
  color: #b45309;
  font-weight: bold;
}

.pause-reminder {
  background: #fff3b0;
  border-radius: 12px;
  padding: 8px;
  font-size: 14px;
}

.error {
  color: #c0392b;
}
```

- [ ] **Step 1: Replace the file with the version below**

Replace the full contents of `src/child/style.css` with:

```css
:root {
  color-scheme: light;
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, #ffe6fb, #e9defc);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen {
  width: min(90vw, 480px);
  text-align: center;
  padding: 24px;
  position: relative;
}

.avatar {
  font-size: 96px;
  display: inline-block;
}

.aura-1 {
  filter: drop-shadow(0 0 4px #e9defc);
}

.aura-2 {
  filter: drop-shadow(0 0 10px #c9b8ff);
}

.aura-3 {
  filter: drop-shadow(0 0 14px #ffb8e6) drop-shadow(0 0 4px #b8e0ff);
}

.aura-4 {
  filter: drop-shadow(0 0 18px #ffd166) drop-shadow(0 0 8px #ff8fd6);
  animation: aura-pulse 1.8s ease-in-out infinite;
}

.aura-5 {
  filter: drop-shadow(0 0 24px #ffd166) drop-shadow(0 0 12px #ff8fd6) drop-shadow(0 0 6px #8fd6ff);
  animation: aura-pulse 1.3s ease-in-out infinite;
}

@keyframes aura-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

.sound-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.big-button {
  font-size: 20px;
  padding: 16px 24px;
  border-radius: 24px;
  border: none;
  background: #c9b8ff;
  color: #3a2f6b;
  cursor: pointer;
  width: 100%;
  margin-top: 12px;
}

.big-button:active {
  transform: scale(0.97);
}

.options {
  display: flex;
  gap: 12px;
}

input {
  font-size: 20px;
  padding: 10px;
  border-radius: 12px;
  border: 2px solid #c9b8ff;
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0;
}

.feedback {
  animation: pop 0.3s ease-out;
}

.feedback.correct {
  color: #2e7d32;
  font-weight: bold;
}

.feedback.incorrect {
  color: #b45309;
  font-weight: bold;
}

@keyframes pop {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); }
}

.pause-reminder {
  background: #fff3b0;
  border-radius: 12px;
  padding: 8px;
  font-size: 14px;
}

.confetti {
  position: relative;
  height: 40px;
  margin: 8px 0;
  overflow: hidden;
}

.confetti span {
  position: absolute;
  top: -20px;
  font-size: 20px;
  animation: confetti-fall 1.2s ease-in forwards;
}

@keyframes confetti-fall {
  to {
    transform: translateY(80px) rotate(360deg);
    opacity: 0;
  }
}

.error {
  color: #c0392b;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add aura, pop, and confetti CSS animations"
```

---

### Task 4: UI rendering updates

**Files:**
- Modify: `src/child/ui.js`

The current `renderHome` and `renderResults` functions (as of this plan) are:

```js
export function renderHome(root, { childName, avatarLevel, badgesCount, onStartMission }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <div class="avatar">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      <p>${badgesCount} badge${badgesCount > 1 ? 's' : ''} gagné${badgesCount > 1 ? 's' : ''}</p>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
}
```

```js
export function renderResults(root, { correctCount, questionsTotal, gainedXp, leveledUp, newBadges, onContinue }) {
  root.innerHTML = `
    <div class="screen results-screen">
      <h1>🎉 Mission terminée !</h1>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <p>+${gainedXp} XP</p>
      ${leveledUp ? '<p class="level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${newBadges.length ? `<p class="badge-earned">🏅 Nouveau badge : ${newBadges.join(', ')}</p>` : ''}
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
}
```

`renderPairing`, `renderQuestion`, and `renderConnectionError` are unchanged by this task — the "pop" animation on feedback text is handled entirely by the CSS class selector added in Task 3 (`.feedback { animation: pop ... }`), which applies automatically since `renderQuestion` already sets `class="feedback ${feedback}"` and re-creates the element on every render.

- [ ] **Step 1: Replace `renderHome`**

In `src/child/ui.js`, replace:

```js
export function renderHome(root, { childName, avatarLevel, badgesCount, onStartMission }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <div class="avatar">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      <p>${badgesCount} badge${badgesCount > 1 ? 's' : ''} gagné${badgesCount > 1 ? 's' : ''}</p>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
}
```

with:

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

- [ ] **Step 2: Replace `renderResults`**

In `src/child/ui.js`, replace:

```js
export function renderResults(root, { correctCount, questionsTotal, gainedXp, leveledUp, newBadges, onContinue }) {
  root.innerHTML = `
    <div class="screen results-screen">
      <h1>🎉 Mission terminée !</h1>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <p>+${gainedXp} XP</p>
      ${leveledUp ? '<p class="level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${newBadges.length ? `<p class="badge-earned">🏅 Nouveau badge : ${newBadges.join(', ')}</p>` : ''}
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
}
```

with:

```js
export function renderResults(root, { correctCount, questionsTotal, gainedXp, leveledUp, newBadges, onContinue }) {
  root.innerHTML = `
    <div class="screen results-screen">
      <h1>🎉 Mission terminée !</h1>
      <div class="confetti">
        <span style="left:10%">🎉</span>
        <span style="left:30%">✨</span>
        <span style="left:50%">🎊</span>
        <span style="left:70%">✨</span>
        <span style="left:90%">🎉</span>
      </div>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <p>+${gainedXp} XP</p>
      ${leveledUp ? '<p class="level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${newBadges.length ? `<p class="badge-earned">🏅 Nouveau badge : ${newBadges.join(', ')}</p>` : ''}
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
}
```

There is no automated test for this file (consistent with the rest of the UI layer in this project — verified manually via the browser in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render sound toggle, aura, and confetti in the child UI"
```

---

### Task 5: Wire sound and aura into orchestration

**Files:**
- Modify: `src/child/main.js`

The current file (as of this plan, after Tasks 1-10 of the original MVP plan and the review fixes) is:

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

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

let familyId = getStoredFamilyId();
let session = null;
let lastFeedback = null;

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

async function showHome() {
  try {
    await ensureAuth();
    const profile = await loadProfile(familyId);
    renderHome(root, {
      childName: profile.childName,
      avatarLevel: profile.avatarLevel,
      badgesCount: profile.badges.length,
      onStartMission: startMission,
    });
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
    badgesCount: profile.badges.length,
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
    if (progressionResult.leveledUp) {
      playLevelUpSound();
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

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing test files, plus the 2 new ones from Tasks 1-2 — 44 tests total: 36 from the original MVP + 3 sound + 5 avatar)

- [ ] **Step 3: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire sound, mute toggle, and avatar aura into child app orchestration"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, including the two new ones from Tasks 1-2.

- [ ] **Step 2: Start the dev server and open the child app**

Run: `npm run dev`, open `http://localhost:5173/` (already paired from prior testing, or pair again with an existing family's code).

- [ ] **Step 3: Verify the sound toggle**

On the home screen, confirm the 🔊/🔇 button appears top-right, toggles icon on click, and the choice persists across a page reload (check browser dev tools → Application → Local Storage → `missionsDeLuna.soundEnabled`).

- [ ] **Step 4: Verify the avatar aura**

Confirm the unicorn on the home screen has a visible glow matching the current `avatarLevel` (a level-1 profile shows a faint aura; if the test profile is already at a higher level from prior testing, confirm the aura is visibly larger/richer, with a subtle pulse animation at level 4+).

- [ ] **Step 5: Verify answer feedback**

Start a mission, answer a question correctly — confirm a sound plays (if sound is on) and the feedback text pops in with a bounce animation. Answer one incorrectly — confirm a different (non-punishing) sound and the same pop animation.

- [ ] **Step 6: Verify mission completion**

Finish the mission — confirm the completion sound plays, confetti animates across the top of the results screen, and (if a level-up occurred) the extra level-up sound plays.

- [ ] **Step 7: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-6 against the live URL.
