# Révision ciblée Implementation Plan

**Goal:** Permettre au parent de désigner une notion prioritaire depuis le tableau de bord ; les missions suivantes de l'enfant sont alors majoritairement composées de cette notion (~70%), le reste continuant de tourner sur les autres notions.

**Tech Stack:** Vanilla JavaScript, Vitest, Firebase (Firestore).

---

### Task 1: Mission generation biased toward a focus type (TDD)

**Files:**
- Modify: `src/child/questions.js`
- Modify: `tests/child/questions.test.js`

- [x] Add failing tests to `tests/child/questions.test.js` (new `describe('generateMission with a focusType')` block): exactly 7/10 questions of the focus type; remainder cycles the other 5 types in catalogue order; unknown/null focus type falls back to the existing round-robin mix; the focus type's difficulty level is passed through to its generator.
- [x] Run `npx vitest run tests/child/questions.test.js` — verify new tests fail.
- [x] Implement the 3rd `focusType = null` parameter on `generateMission`, per the design doc.
- [x] Run `npx vitest run tests/child/questions.test.js` — verify all pass.
- [x] Commit: `feat: bias mission generation toward a focus type (TDD)`

### Task 2: Parent-side write helper

**Files:**
- Modify: `src/parent/family.js`

- [x] Add `setFocusType(familyId, focusType)`.
- [x] Add `focusType: null` to the initial profile document written by `createFamily`.
- [x] Commit: `feat: add setFocusType to the parent family module`

### Task 3: Focus selector on the parent dashboard

**Files:**
- Modify: `src/parent/dashboard.js`
- Modify: `src/parent/style.css`

- [x] Add `NOTION_TYPES` + `capitalize` helper, the new `.focus-selector` section, and the `onSetFocus` wiring, per the design doc.
- [x] Add `.focus-selector select` styling.
- [x] Commit: `feat: render focus-type selector on parent dashboard`

### Task 4: Wire the selector into parent orchestration

**Files:**
- Modify: `src/parent/main.js`

- [x] `loadDashboard` builds `onSetFocus` as a closure that calls `setFocusType` then reloads the dashboard.
- [x] Commit: `feat: wire focus-type selection into parent orchestration`

### Task 5: Child home-screen reminder + mission wiring

**Files:**
- Modify: `src/child/ui.js`
- Modify: `src/child/main.js`
- Modify: `src/child/style.css`

- [x] `renderHome` gains a `focusType` field and renders `.focus-banner` with the `FOCUS_LABELS` French phrasing when set.
- [x] `main.js`: `renderHomeScreen` passes `focusType`; `startMission` passes `lastProfile?.focusType ?? null` to `generateMission`.
- [x] `.focus-banner` styling in `src/child/style.css`.
- [x] Commit: `feat: show today's focus notion on child home screen`

### Task 6: Verification

- [x] Run the full test suite (`npx vitest run`) — all green, no regressions.
- [x] Run `npm run build` — builds without errors.
- [ ] Manual verification against a live Firebase project (parent selects a focus type, child sees the banner and a biased mission) and `firebase deploy --only hosting` — left to the user, this environment has no Firebase project credentials to exercise the live app end-to-end.
