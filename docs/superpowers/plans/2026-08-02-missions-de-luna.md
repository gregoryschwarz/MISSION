# Missions de Luna Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA where an 8-year-old plays a daily math mission (CE2 level, unicorn theme) on a tablet, with results synced to Firebase so a parent can review progress from a separate dashboard.

**Architecture:** A single Vite project with two HTML entry points (`index.html` for the child, `parent.html` for the parent dashboard) sharing pure-logic modules under `src/shared/`. Firebase Firestore stores family/session/profile data directly from the client (no custom backend); Firebase Auth handles parent email/password login and anonymous auth for the child device. All game logic (question generation, scoring, XP/streak/badges, offline sync queue, PIN hashing) is framework-free and unit-tested with Vitest; UI rendering is plain DOM manipulation verified manually via the dev server.

**Tech Stack:** Vite, vanilla JavaScript (ES modules), Firebase (Firestore + Auth + Hosting), Vitest, Web Crypto API (SHA-256 for PIN hashing).

---

## Architecture note (refinement made during planning)

The approved design says the child device pairs via a PIN stored in the family document. While planning the Firestore security rules, a contradiction surfaced: reading `families/{familyId}` must be restricted to the parent's UID (otherwise any anonymous user could read every family's data), but the child device — running anonymous auth — needs to read the PIN hash *before* it has any relationship to the family.

**Resolution:** the PIN hash and child's name live in a separate subdocument `families/{familyId}/pairing/data`, readable by any authenticated user (including anonymous), while the parent-only fields (`parentUid`, `parentEmail`) stay on the private parent-only `families/{familyId}` document. The `familyId` itself acts as the shared secret the parent types into the tablet once (shown on the dashboard as "code d'appairage"); the PIN is a second factor on top of that. This keeps the "no Cloud Functions" constraint from the design while keeping child data properly scoped. Session and profile writes from the child device use the same "any authenticated user, but only if they already know the familyId" pattern, matching the design's stated security model.

---

### Task 1: Scaffold the Vite project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `.gitignore` (append to existing)
- Create: `index.html`
- Create: `parent.html`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "revision-maths-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "firebase": "^10.12.0"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        parent: resolve(__dirname, 'parent.html'),
      },
    },
  },
});
```

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 4: Append to `.gitignore`**

Add these lines (the file already has `.superpowers/` and `node_modules/` from the brainstorming phase):

```
dist/
.env
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>Missions de Luna</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="stylesheet" href="/src/child/style.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/child/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Create `parent.html`**

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Missions de Luna — Espace parent</title>
  <link rel="stylesheet" href="/src/parent/style.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/parent/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.js vitest.config.js .gitignore index.html parent.html package-lock.json
git commit -m "build: scaffold Vite project with child and parent entry points"
```

---

### Task 2: Firebase project wiring

**Files:**
- Create: `.env.example`
- Create: `src/shared/firebaseConfig.js`
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `README.md`

- [ ] **Step 1: Create `.env.example`**

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 2: Create `src/shared/firebaseConfig.js`**

```js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

- [ ] **Step 3: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.parentUid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.parentUid;

      match /pairing/{docId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid ==
          get(/databases/$(database)/documents/families/$(familyId)).data.parentUid;
      }

      match /profile/{docId} {
        allow read: if request.auth != null && request.auth.uid ==
          get(/databases/$(database)/documents/families/$(familyId)).data.parentUid;
        allow write: if request.auth != null;
      }

      match /sessions/{sessionId} {
        allow read: if request.auth != null && request.auth.uid ==
          get(/databases/$(database)/documents/families/$(familyId)).data.parentUid;
        allow create: if request.auth != null;
      }
    }
  }
}
```

- [ ] **Step 4: Create `firebase.json`**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/parent", "destination": "/parent.html" },
      { "source": "/parent/**", "destination": "/parent.html" }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Missions de Luna

Application PWA de révision maths (niveau CE2) pour tablette, avec suivi parent à distance.

## Configuration initiale (une seule fois)

1. Créer un projet sur https://console.firebase.google.com
2. Dans le projet : **Authentication** → activer le fournisseur **Email/Password**.
3. Dans le projet : **Firestore Database** → créer une base en mode production.
4. Dans **Paramètres du projet** → **Général** → section "Vos applications" → créer une application Web, copier les valeurs de config.
5. Copier `.env.example` vers `.env` et coller les valeurs récupérées à l'étape 4.
6. Installer les dépendances : `npm install`
7. Installer la CLI Firebase si besoin : `npm install -g firebase-tools`, puis `firebase login`
8. Lier le projet : `firebase use --add` (choisir le projet créé à l'étape 1) — ceci crée `.firebaserc`.

## Développement

```bash
npm run dev
```

Ouvre l'écran enfant sur `http://localhost:5173/` et le dashboard parent sur `http://localhost:5173/parent.html`.

## Tests

```bash
npm test
```

## Déploiement

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

## Installer sur la tablette

Ouvrir l'URL déployée dans Chrome ou Safari sur la tablette, puis utiliser "Ajouter à l'écran d'accueil" / "Installer l'application".

## Appairer la tablette

1. Le parent se connecte sur `/parent.html`, crée son compte, puis crée le profil de l'enfant (prénom + code secret à 4 chiffres).
2. Le dashboard affiche un "code d'appairage".
3. Sur la tablette, au premier lancement, entrer ce code d'appairage et le code secret.
```

- [ ] **Step 6: Commit**

```bash
git add .env.example src/shared/firebaseConfig.js firebase.json firestore.rules README.md
git commit -m "build: wire up Firebase config, security rules, and setup docs"
```

---

### Task 3: PIN hashing (TDD)

**Files:**
- Create: `src/shared/pin.js`
- Test: `tests/shared/pin.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/pin.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '../../src/shared/pin.js';

describe('hashPin', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await hashPin('1234');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).toBe(b);
  });

  it('produces different hashes for different PINs', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('4321');
    expect(a).not.toBe(b);
  });
});

describe('verifyPin', () => {
  it('returns true for a matching PIN', async () => {
    const hash = await hashPin('7890');
    expect(await verifyPin('7890', hash)).toBe(true);
  });

  it('returns false for a non-matching PIN', async () => {
    const hash = await hashPin('7890');
    expect(await verifyPin('0000', hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/pin.test.js`
Expected: FAIL — cannot find module `../../src/shared/pin.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/pin.js`:

```js
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin, hash) {
  const computed = await hashPin(pin);
  return computed === hash;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/pin.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/pin.js tests/shared/pin.test.js
git commit -m "feat: add PIN hashing with SHA-256"
```

---

### Task 4: Question generation logic (TDD)

**Files:**
- Create: `src/child/questions.js`
- Test: `tests/child/questions.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/questions.test.js`:

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/questions.test.js`
Expected: FAIL — cannot find module `../../src/child/questions.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/questions.js`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/questions.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/questions.js tests/child/questions.test.js
git commit -m "feat: add CE2 question generators for addition, subtraction, multiplication, comparison"
```

---

### Task 5: Mission session & scoring (TDD)

**Files:**
- Create: `src/child/session.js`
- Test: `tests/child/session.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/session.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  createSession,
  currentQuestion,
  submitAnswer,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/session.test.js`
Expected: FAIL — cannot find module `../../src/child/session.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/session.js`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/session.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/session.js tests/child/session.test.js
git commit -m "feat: add mission session state and scoring"
```

---

### Task 6: XP, level, streak and badges progression (TDD)

**Files:**
- Create: `src/shared/progression.js`
- Test: `tests/shared/progression.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/progression.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  xpForSession,
  levelForXp,
  updateStreak,
  newlyEarnedBadges,
  applyProgression,
} from '../../src/shared/progression.js';

describe('xpForSession', () => {
  it('awards 10 xp per correct answer', () => {
    expect(xpForSession(7)).toBe(70);
  });
});

describe('levelForXp', () => {
  it('starts at level 1 with 0 xp', () => {
    expect(levelForXp(0)).toBe(1);
  });
  it('levels up every 100 xp', () => {
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });
});

describe('updateStreak', () => {
  it('starts a streak at 1 for the first session', () => {
    expect(updateStreak(0, null, '2026-08-02')).toBe(1);
  });
  it('increments the streak for a consecutive day', () => {
    expect(updateStreak(3, '2026-08-01', '2026-08-02')).toBe(4);
  });
  it('resets the streak after a gap', () => {
    expect(updateStreak(5, '2026-07-20', '2026-08-02')).toBe(1);
  });
  it('keeps the streak unchanged for the same day', () => {
    expect(updateStreak(2, '2026-08-02', '2026-08-02')).toBe(2);
  });
});

describe('newlyEarnedBadges', () => {
  it('awards a badge once the streak threshold is reached', () => {
    expect(newlyEarnedBadges(3, [])).toEqual(['streak-3']);
  });
  it('does not re-award an existing badge', () => {
    expect(newlyEarnedBadges(3, ['streak-3'])).toEqual([]);
  });
});

describe('applyProgression', () => {
  it('combines xp, level, streak and badges into a profile update', () => {
    const profile = { xp: 90, avatarLevel: 1, streakDays: 2, badges: [], lastSessionDate: '2026-08-01' };
    const summary = { date: '2026-08-02', correctCount: 3 };
    const result = applyProgression(profile, summary);
    expect(result.xp).toBe(120);
    expect(result.avatarLevel).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.streakDays).toBe(3);
    expect(result.newBadges).toEqual(['streak-3']);
    expect(result.badges).toEqual(['streak-3']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: FAIL — cannot find module `../../src/shared/progression.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/progression.js`:

```js
const XP_PER_CORRECT = 10;
const XP_PER_LEVEL = 100;

const STREAK_BADGES = [
  { days: 3, id: 'streak-3' },
  { days: 7, id: 'streak-7' },
  { days: 30, id: 'streak-30' },
];

export function xpForSession(correctCount) {
  return correctCount * XP_PER_CORRECT;
}

export function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function updateStreak(previousStreak, lastSessionDate, today) {
  if (!lastSessionDate) return 1;
  const prev = new Date(lastSessionDate);
  const current = new Date(today);
  const diffDays = Math.round((current - prev) / 86400000);
  if (diffDays === 0) return previousStreak;
  if (diffDays === 1) return previousStreak + 1;
  return 1;
}

export function newlyEarnedBadges(streakDays, existingBadges) {
  return STREAK_BADGES.filter(
    (b) => streakDays >= b.days && !existingBadges.includes(b.id)
  ).map((b) => b.id);
}

export function applyProgression(profile, sessionSummary) {
  const today = sessionSummary.date;
  const gainedXp = xpForSession(sessionSummary.correctCount);
  const xp = profile.xp + gainedXp;
  const avatarLevel = levelForXp(xp);
  const streakDays = updateStreak(profile.streakDays, profile.lastSessionDate, today);
  const newBadges = newlyEarnedBadges(streakDays, profile.badges);
  const badges = [...profile.badges, ...newBadges];
  return {
    xp,
    avatarLevel,
    streakDays,
    badges,
    lastSessionDate: today,
    leveledUp: avatarLevel > profile.avatarLevel,
    newBadges,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: add XP, level, streak, and badge progression logic"
```

---

### Task 7: Offline sync queue (TDD)

**Files:**
- Create: `src/shared/syncQueue.js`
- Test: `tests/shared/syncQueue.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/syncQueue.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { enqueueSession, readQueue, flushQueue } from '../../src/shared/syncQueue.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('enqueueSession / readQueue', () => {
  it('stores sessions and reads them back in order', () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    enqueueSession({ date: '2026-08-02' }, storage);
    expect(readQueue(storage)).toEqual([{ date: '2026-08-01' }, { date: '2026-08-02' }]);
  });
});

describe('flushQueue', () => {
  it('removes sessions that sync successfully', async () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    const writeSession = vi.fn().mockResolvedValue(undefined);
    const result = await flushQueue(writeSession, storage);
    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(readQueue(storage)).toEqual([]);
  });

  it('keeps sessions that fail to sync', async () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    const writeSession = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await flushQueue(writeSession, storage);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(readQueue(storage)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/syncQueue.test.js`
Expected: FAIL — cannot find module `../../src/shared/syncQueue.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/syncQueue.js`:

```js
const STORAGE_KEY = 'missionsDeLuna.pendingSessions';

export function readQueue(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function enqueueSession(summary, storage = window.localStorage) {
  const pending = readQueue(storage);
  pending.push(summary);
  storage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export async function flushQueue(writeSession, storage = window.localStorage) {
  const pending = readQueue(storage);
  const remaining = [];
  for (const summary of pending) {
    try {
      await writeSession(summary);
    } catch (err) {
      remaining.push(summary);
    }
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { synced: pending.length - remaining.length, failed: remaining.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/syncQueue.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/syncQueue.js tests/shared/syncQueue.test.js
git commit -m "feat: add localStorage-backed offline sync queue"
```

---

### Task 8: Child-family pairing logic (TDD)

**Files:**
- Create: `src/child/pairing.js`
- Test: `tests/child/pairing.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/child/pairing.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { hashPin } from '../../src/shared/pin.js';

vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  getDoc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';
import { pairWithFamily, getStoredFamilyId, storeFamilyId } from '../../src/child/pairing.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('pairWithFamily', () => {
  it('succeeds when the family exists and the pin matches', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithFamily({}, 'family-abc', '1234');
    expect(result).toEqual({ success: true, childName: 'Luna' });
  });

  it('fails when the pin does not match', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithFamily({}, 'family-abc', '0000');
    expect(result).toEqual({ success: false, reason: 'wrong-pin' });
  });

  it('fails when the family does not exist', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const result = await pairWithFamily({}, 'unknown', '1234');
    expect(result).toEqual({ success: false, reason: 'unknown-family' });
  });
});

describe('familyId storage', () => {
  it('stores and retrieves the family id', () => {
    const storage = createFakeStorage();
    storeFamilyId('family-abc', storage);
    expect(getStoredFamilyId(storage)).toBe('family-abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/child/pairing.test.js`
Expected: FAIL — cannot find module `../../src/child/pairing.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/child/pairing.js`:

```js
import { doc, getDoc } from 'firebase/firestore';
import { verifyPin } from '../shared/pin.js';

const FAMILY_ID_KEY = 'missionsDeLuna.familyId';

export function getStoredFamilyId(storage = window.localStorage) {
  return storage.getItem(FAMILY_ID_KEY);
}

export function storeFamilyId(familyId, storage = window.localStorage) {
  storage.setItem(FAMILY_ID_KEY, familyId);
}

export async function pairWithFamily(db, familyId, pin) {
  const pairingRef = doc(db, 'families', familyId, 'pairing', 'data');
  const snapshot = await getDoc(pairingRef);
  if (!snapshot.exists()) {
    return { success: false, reason: 'unknown-family' };
  }
  const { pinHash, childName } = snapshot.data();
  const valid = await verifyPin(pin, pinHash);
  if (!valid) {
    return { success: false, reason: 'wrong-pin' };
  }
  return { success: true, childName };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/child/pairing.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/child/pairing.js tests/child/pairing.test.js
git commit -m "feat: add child-device family pairing logic"
```

---

### Task 9: Child app UI screens

**Files:**
- Create: `src/child/ui.js`
- Create: `src/child/style.css`

- [ ] **Step 1: Create `src/child/ui.js`**

```js
export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions de Luna</h1>
      <p>Un parent doit entrer le code d'appairage et le code secret.</p>
      <form id="pairing-form">
        <label>Code d'appairage<input id="family-id" type="text" autocomplete="off" required /></label>
        <label>Code secret (4 chiffres)<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        ${error ? `<p class="error">${error}</p>` : ''}
        <button type="submit" class="big-button">Valider</button>
      </form>
    </div>
  `;
  root.querySelector('#pairing-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const familyId = root.querySelector('#family-id').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    onSubmit({ familyId, pin });
  });
}

export function renderHome(root, { childName, avatarLevel, badgesCount, onStartMission }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <div class="avatar">🦄</div>
      <h1>${childName ?? 'Luna'} — niveau ${avatarLevel}</h1>
      <p>${badgesCount} badge${badgesCount > 1 ? 's' : ''} gagné${badgesCount > 1 ? 's' : ''}</p>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
}

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

- [ ] **Step 2: Create `src/child/style.css`**

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

- [ ] **Step 3: Commit**

```bash
git add src/child/ui.js src/child/style.css
git commit -m "feat: add child app UI rendering for pairing, home, mission, and results screens"
```

---

### Task 10: Child app orchestration

**Files:**
- Create: `src/child/main.js`

- [ ] **Step 1: Create `src/child/main.js`**

```js
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { getStoredFamilyId, storeFamilyId, pairWithFamily } from './pairing.js';
import { generateMission } from './questions.js';
import { createSession, currentQuestion, submitAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderHome, renderQuestion, renderResults } from './ui.js';

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
  await ensureAuth();
  const profile = await loadProfile(familyId);
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badgesCount: profile.badges.length,
    onStartMission: startMission,
  });
  flushQueue((summary) => writeSession(familyId, summary)).catch(() => {});
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
  await ensureAuth();
  const result = await pairWithFamily(db, candidateId, pin);
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

- [ ] **Step 2: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire up child app orchestration (pairing, mission, sync)"
```

---

### Task 11: Parent authentication module

**Files:**
- Create: `src/parent/auth.js`

- [ ] **Step 1: Create `src/parent/auth.js`**

```js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../shared/firebaseConfig.js';

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logOut() {
  return signOut(auth);
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/parent/auth.js
git commit -m "feat: add parent email/password authentication module"
```

---

### Task 12: Parent family module

**Files:**
- Create: `src/parent/family.js`

- [ ] **Step 1: Create `src/parent/family.js`**

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

- [ ] **Step 2: Commit**

```bash
git add src/parent/family.js
git commit -m "feat: add parent family creation and data fetch module"
```

---

### Task 13: Parent dashboard breakdown aggregation (TDD) + rendering

**Files:**
- Create: `src/parent/dashboard.js`
- Test: `tests/parent/dashboard.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/parent/dashboard.test.js`:

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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parent/dashboard.test.js`
Expected: FAIL — cannot find module `../../src/parent/dashboard.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/parent/dashboard.js`:

```js
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
        <h1>Tableau de bord — ${profile.childName}</h1>
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
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/parent/dashboard.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/parent/dashboard.js tests/parent/dashboard.test.js
git commit -m "feat: add parent dashboard breakdown aggregation and rendering"
```

---

### Task 14: Parent app orchestration

**Files:**
- Create: `src/parent/main.js`
- Create: `src/parent/style.css`

- [ ] **Step 1: Create `src/parent/main.js`**

```js
import { signUp, logIn, logOut, watchAuthState } from './auth.js';
import { findFamilyByParent, createFamily, fetchProfile, fetchSessions } from './family.js';
import { renderDashboard } from './dashboard.js';

const root = document.getElementById('app');

function renderAuthForm(mode = 'login', error = null) {
  root.innerHTML = `
    <div class="auth-screen">
      <h1>Missions de Luna — Espace parent</h1>
      <form id="auth-form">
        <label>Email<input id="email" type="email" required /></label>
        <label>Mot de passe<input id="password" type="password" minlength="6" required /></label>
        ${error ? `<p class="error">${error}</p>` : ''}
        <button type="submit">${mode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
      </form>
      <button id="toggle-mode">${mode === 'login' ? 'Créer un compte' : "J'ai déjà un compte"}</button>
    </div>
  `;
  root.querySelector('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    try {
      if (mode === 'login') {
        await logIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      renderAuthForm(mode, err.message);
    }
  });
  root.querySelector('#toggle-mode').addEventListener('click', () => {
    renderAuthForm(mode === 'login' ? 'signup' : 'login');
  });
}

function renderFamilySetup(parentUid, parentEmail) {
  root.innerHTML = `
    <div class="family-setup">
      <h1>Bienvenue ! Créons le profil de votre enfant</h1>
      <form id="family-form">
        <label>Prénom de l'enfant<input id="child-name" required /></label>
        <label>Code secret à 4 chiffres<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        <button type="submit">Créer</button>
      </form>
    </div>
  `;
  root.querySelector('#family-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const childName = root.querySelector('#child-name').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    await createFamily({ parentUid, parentEmail, childName, pin });
    await loadDashboard(parentUid);
  });
}

async function loadDashboard(parentUid) {
  const family = await findFamilyByParent(parentUid);
  if (!family) return;
  const [profile, sessions] = await Promise.all([fetchProfile(family.id), fetchSessions(family.id)]);
  renderDashboard(root, { family, profile, sessions, onSignOut: logOut });
}

watchAuthState(async (user) => {
  if (!user) {
    renderAuthForm();
    return;
  }
  const family = await findFamilyByParent(user.uid);
  if (family) {
    await loadDashboard(user.uid);
  } else {
    renderFamilySetup(user.uid, user.email);
  }
});
```

- [ ] **Step 2: Create `src/parent/style.css`**

```css
:root {
  color-scheme: light;
  font-family: 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f7f5fb;
  display: flex;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.dashboard, .auth-screen, .family-setup {
  width: min(100%, 640px);
}

section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

label {
  display: block;
  margin-bottom: 12px;
}

input {
  display: block;
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  box-sizing: border-box;
}

button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: #c9b8ff;
  cursor: pointer;
}

.error {
  color: #c0392b;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/parent/main.js src/parent/style.css
git commit -m "feat: wire up parent app orchestration (auth, family setup, dashboard)"
```

---

### Task 15: PWA manifest, icon, and service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon.svg`
- Create: `public/sw.js`

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Missions de Luna",
  "short_name": "Luna",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#e9defc",
  "theme_color": "#c9b8ff",
  "icons": [
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Create `public/icons/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#c9b8ff"/>
  <text x="50" y="66" font-size="60" text-anchor="middle">🦄</text>
</svg>
```

- [ ] **Step 3: Create `public/sw.js`**

```js
const CACHE_NAME = 'missions-de-luna-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/icons/icon.svg public/sw.js
git commit -m "feat: add PWA manifest, icon, and offline service worker"
```

---

### Task 16: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass (pin, questions, session, progression, syncQueue, pairing, dashboard).

- [ ] **Step 2: Complete the Firebase setup from `README.md`**

Follow the "Configuration initiale" section: create the Firebase project, enable Email/Password auth, create Firestore, fill in `.env`, run `firebase use --add`.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`
Expected: server starts, prints a local URL (e.g. `http://localhost:5173/`).

- [ ] **Step 4: Verify the parent flow**

Open `http://localhost:5173/parent.html` in a browser. Create an account, create the child's profile (name + PIN), confirm the dashboard renders with the "code d'appairage" shown.

- [ ] **Step 5: Verify the child flow**

Open `http://localhost:5173/` in a separate browser tab/window. Enter the pairing code and PIN from step 4. Confirm the home screen shows the avatar and "Mission du jour" button. Play through a full mission (10 questions) and confirm the results screen shows the score and XP gained.

- [ ] **Step 6: Verify parent sees the session**

Reload the parent dashboard tab. Confirm the new session appears in "Sessions récentes" and the breakdown percentages update.

- [ ] **Step 7: Verify offline behavior**

In the child tab's browser dev tools, switch to offline mode. Play another mission — it should complete normally (questions generated locally). Switch back online and reload the child app; confirm the queued session syncs (check the parent dashboard for a second session after refresh).

- [ ] **Step 8: Deploy**

Run: `npm run build && firebase deploy --only firestore:rules,hosting`
Expected: deploy succeeds, prints a Hosting URL.

- [ ] **Step 9: Install on the tablet**

Open the Hosting URL on the tablet's browser, use "Add to Home Screen" / "Install app". Repeat the pairing flow (step 5) on the tablet itself.
