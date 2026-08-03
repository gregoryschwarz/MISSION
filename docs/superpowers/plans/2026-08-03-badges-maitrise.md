# Badges de maîtrise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new badge families — mastery badges (one per operation type, earned on first reaching difficulty tier "Avancé") and perfect-mission badges (tiers 1/10/50 cumulative flawless missions) — displayed grouped by category (Série/Maîtrise/Missions parfaites) alongside the existing streak badges.

**Architecture:** `src/shared/badges.js` grows from 3 to 10 badge definitions with a `category` field, and its rendering function groups medallions into 3 titled sections instead of one flat row — the exported function name and signature stay the same, so no caller changes are needed there. `src/shared/progression.js` gains two new pure helper functions (`newlyMasteredTypes`, `newlyEarnedPerfectBadges`) and `applyProgression` gains a third parameter (`nextDifficultyLevels`) plus a new `perfectMissionsCount` field on its return value. `src/child/main.js` is reordered so the post-mission difficulty levels are computed before calling `applyProgression`, and the new counter is persisted to Firestore alongside the rest of the profile.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Grouped badge categories (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Modify: `tests/shared/badges.test.js`

The current content of `src/shared/badges.js` is:

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

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/shared/badges.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 10 badges with a category, in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'streak-3',
      'streak-7',
      'streak-30',
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
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
    const result = badgeMedallionData(['streak-3', 'mastery-addition']);
    expect(result).toHaveLength(10);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-addition')).toMatchObject({ earned: true });
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

  it('renders all 4 mastery badges and all 3 perfect-mission badges', () => {
    const html = renderBadgeMedallionsHtml(['mastery-addition', 'perfect-1']);
    expect(html).toContain('➕');
    expect(html).toContain('💯');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: FAIL — `BADGES` only has 3 entries, `BADGE_CATEGORIES` is not exported, grouped-section assertions fail.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/shared/badges.js` with:

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

Note: `renderBadgeMedallionsHtml`'s exported name and single-argument signature are unchanged from before — it now returns 3 wrapped `.badge-category` sections instead of one flat row of `.badge-medallion` elements. Every existing caller (`src/child/ui.js`'s `renderHome`, `src/parent/dashboard.js`'s `renderDashboard`) keeps working with zero changes, since they just interpolate the returned HTML string into a `<div class="badges-row">...</div>` wrapper — that wrapper now contains 3 nested `.badge-category` blocks, each with its own inner `.badges-row`. This is addressed in Task 4 (CSS) so the visual nesting looks right; no JS changes needed in `ui.js`/`dashboard.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/badges.js tests/shared/badges.test.js
git commit -m "feat: add mastery and perfect-mission badges, grouped by category"
```

---

### Task 2: Mastery and perfect-mission badge logic (TDD)

**Files:**
- Modify: `src/shared/progression.js`
- Modify: `tests/shared/progression.test.js`

The current content of `src/shared/progression.js` is:

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

- [ ] **Step 1: Write the failing test**

Replace the full contents of `tests/shared/progression.test.js` with:

```js
import { describe, it, expect } from 'vitest';
import {
  xpForSession,
  levelForXp,
  updateStreak,
  newlyEarnedBadges,
  newlyMasteredTypes,
  newlyEarnedPerfectBadges,
  applyProgression,
} from '../../src/shared/progression.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../../src/shared/difficulty.js';

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

describe('newlyMasteredTypes', () => {
  it('detects a type that just reached level 3', () => {
    const previous = { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['addition']);
  });

  it('does not re-trigger for a type already at level 3 before the mission', () => {
    const previous = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual([]);
  });

  it('detects multiple types mastered in the same mission', () => {
    const previous = { addition: 2, soustraction: 2, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 3, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['addition', 'soustraction']);
  });
});

describe('newlyEarnedPerfectBadges', () => {
  it('awards the first perfect-mission badge at count 1', () => {
    expect(newlyEarnedPerfectBadges(1, [])).toEqual(['perfect-1']);
  });

  it('does not re-award an existing perfect badge', () => {
    expect(newlyEarnedPerfectBadges(1, ['perfect-1'])).toEqual([]);
  });

  it('awards multiple thresholds at once if count jumps past several', () => {
    expect(newlyEarnedPerfectBadges(10, [])).toEqual(['perfect-1', 'perfect-10']);
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

  it('awards a mastery badge when a type reaches level 3 this mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      perfectMissionsCount: 0,
    };
    const summary = { date: '2026-08-02', correctCount: 5, questionsTotal: 10 };
    const nextDifficultyLevels = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    const result = applyProgression(profile, summary, nextDifficultyLevels);
    expect(result.newBadges).toContain('mastery-addition');
    expect(result.badges).toContain('mastery-addition');
  });

  it('increments perfectMissionsCount and awards perfect-1 on a flawless mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
      perfectMissionsCount: 0,
    };
    const summary = { date: '2026-08-02', correctCount: 10, questionsTotal: 10 };
    const result = applyProgression(profile, summary, DEFAULT_DIFFICULTY_LEVELS);
    expect(result.perfectMissionsCount).toBe(1);
    expect(result.newBadges).toContain('perfect-1');
  });

  it('does not increment perfectMissionsCount on an imperfect mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
      perfectMissionsCount: 4,
    };
    const summary = { date: '2026-08-02', correctCount: 9, questionsTotal: 10 };
    const result = applyProgression(profile, summary, DEFAULT_DIFFICULTY_LEVELS);
    expect(result.perfectMissionsCount).toBe(4);
    expect(result.newBadges).not.toContain('perfect-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: FAIL — `newlyMasteredTypes`/`newlyEarnedPerfectBadges` are not exported, and `applyProgression` doesn't yet return `perfectMissionsCount` or award mastery/perfect badges.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/shared/progression.js` with:

```js
import { DEFAULT_DIFFICULTY_LEVELS } from './difficulty.js';

const XP_PER_CORRECT = 10;
const XP_PER_LEVEL = 100;
const MASTERY_LEVEL = 3;
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison'];

const STREAK_BADGES = [
  { days: 3, id: 'streak-3' },
  { days: 7, id: 'streak-7' },
  { days: 30, id: 'streak-30' },
];

const PERFECT_MISSION_BADGES = [
  { count: 1, id: 'perfect-1' },
  { count: 10, id: 'perfect-10' },
  { count: 50, id: 'perfect-50' },
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

export function newlyMasteredTypes(previousLevels, nextLevels) {
  return OPERATION_TYPES.filter(
    (type) => nextLevels[type] === MASTERY_LEVEL && previousLevels[type] !== MASTERY_LEVEL
  );
}

export function newlyEarnedPerfectBadges(perfectMissionsCount, existingBadges) {
  return PERFECT_MISSION_BADGES.filter(
    (b) => perfectMissionsCount >= b.count && !existingBadges.includes(b.id)
  ).map((b) => b.id);
}

export function applyProgression(profile, sessionSummary, nextDifficultyLevels) {
  const today = sessionSummary.date;
  const gainedXp = xpForSession(sessionSummary.correctCount);
  const xp = profile.xp + gainedXp;
  const avatarLevel = levelForXp(xp);
  const streakDays = updateStreak(profile.streakDays, profile.lastSessionDate, today);
  const streakBadges = newlyEarnedBadges(streakDays, profile.badges);

  const previousDifficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const masteredTypes = newlyMasteredTypes(previousDifficultyLevels, nextDifficultyLevels ?? previousDifficultyLevels);
  const masteryBadges = masteredTypes.map((type) => `mastery-${type}`);

  const isPerfect = sessionSummary.correctCount === sessionSummary.questionsTotal;
  const perfectMissionsCount = (profile.perfectMissionsCount ?? 0) + (isPerfect ? 1 : 0);
  const badgesBeforePerfectCheck = [...profile.badges, ...streakBadges, ...masteryBadges];
  const perfectBadges = newlyEarnedPerfectBadges(perfectMissionsCount, badgesBeforePerfectCheck);

  const newBadges = [...streakBadges, ...masteryBadges, ...perfectBadges];
  const badges = [...profile.badges, ...newBadges];

  return {
    xp,
    avatarLevel,
    streakDays,
    badges,
    perfectMissionsCount,
    lastSessionDate: today,
    leveledUp: avatarLevel > profile.avatarLevel,
    newBadges,
  };
}
```

Note: `applyProgression`'s 3rd parameter (`nextDifficultyLevels`) is optional — when omitted (as in the first, pre-existing test), it falls back to `previousDifficultyLevels`, so `newlyMasteredTypes` compares identical levels and never awards a mastery badge. Similarly, when `sessionSummary.questionsTotal` is absent (as in that same pre-existing test), `isPerfect` evaluates to `false`. This keeps the original test passing unmodified while adding the new behavior for callers that pass the full data.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/progression.test.js`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/progression.js tests/shared/progression.test.js
git commit -m "feat: award mastery and perfect-mission badges in progression logic"
```

---

### Task 3: Default perfectMissionsCount on new profiles

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

- [ ] **Step 1: Add the field**

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

`findFamilyByParent`, `fetchProfile`, and `fetchSessions` are unchanged.

- [ ] **Step 2: Commit**

```bash
git add src/parent/family.js
git commit -m "feat: initialize new family profiles with perfectMissionsCount"
```

---

### Task 4: CSS for grouped badge categories

**Files:**
- Modify: `src/child/style.css`
- Modify: `src/parent/style.css`

- [ ] **Step 1: Append to `src/child/style.css`**

Add at the end of the file:

```css
.badge-category {
  margin: 4px 0;
}

.badge-category-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #7a6fa3;
  margin: 4px 0;
  text-align: center;
}
```

- [ ] **Step 2: Append to `src/parent/style.css`**

Add at the end of the file:

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

- [ ] **Step 3: Commit**

```bash
git add src/child/style.css src/parent/style.css
git commit -m "feat: style grouped badge category sections"
```

---

### Task 5: Wire mastery/perfect badge data into child orchestration

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

- [ ] **Step 1: Replace `loadProfile`'s fallback object**

Replace:

```js
async function loadProfile(targetFamilyId) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? snapshot.data()
    : { xp: 0, avatarLevel: 1, badges: [], streakDays: 0, lastSessionDate: null, difficultyLevels: DEFAULT_DIFFICULTY_LEVELS };
}
```

with:

```js
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
```

- [ ] **Step 2: Reorder `finishMission` to compute `nextDifficultyLevels` before calling `applyProgression`, pass it in, and persist `perfectMissionsCount`**

Replace:

```js
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
```

with:

```js
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
```

The rest of `finishMission` (the `writeSession`/`enqueueSession` try/catch, sound playback, `pairsRound = null`, and the final `renderResults` call) is unchanged — `progressionResult.newBadges` already includes any new mastery/perfect badges alongside streak badges, so the existing "new badge earned" sound/results-screen logic picks them up automatically with no further changes needed.

Everything else in the file (`ensureAuth`, `writeSession`, `saveProfile`, `renderHomeScreen`, `toggleSound`, `showHome`, `startMission`, `showQuestion`, `showPairsRound`, `handleAnswer`, `handlePairsMatch`, `handlePairing`, `start`, the service worker registration, the final `start()` call) is unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all test files green (93 existing + 3 new in Task 1 + 10 new in Task 2 = 106 tests total)

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: builds without errors

- [ ] **Step 5: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire mastery and perfect-mission badge data into mission completion"
```

---

### Task 6: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, 106 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing) and the parent dashboard (`http://localhost:5173/parent.html`, already logged in).

- [ ] **Step 3: Verify the grouped badge display**

Confirm both the child home screen and the parent dashboard now show 3 titled rows ("Série", "Maîtrise", "Missions parfaites") instead of one flat row, with locked (🔒, greyed) medallions for everything not yet earned.

- [ ] **Step 4: Verify a mastery badge unlocks**

Play missions on one operation type, deliberately performing well (≥80%) until that type's difficulty tier reaches "Avancé" (visible on the parent dashboard from the difficulté progressive feature). Confirm the corresponding mastery medallion in the "Maîtrise" row unlocks at that moment, and that continuing to play (even if the tier later drops) doesn't remove it.

- [ ] **Step 5: Verify a perfect-mission badge unlocks**

Play one mission answering every question correctly. Confirm the "1 mission parfaite" medallion unlocks. Play more perfect missions to confirm the counter keeps incrementing toward the 10 and 50 thresholds (no need to actually reach 10/50 manually — code review + unit tests already cover the threshold logic).

- [ ] **Step 6: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-5 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
