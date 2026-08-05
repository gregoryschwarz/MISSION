# Système d'aide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Luna an always-available "❓ Aide" button during a mission, in all 3 formats (classic quiz, QCM, pairs-matching), that shows a fixed explanatory text for the current notion (or all 6 notions at once in pairs mode, since that format mixes notions with no single "current" one).

**Architecture:** A new pure module (`src/shared/helpContent.js`) owns the 6 help texts. A small existing duplication is cleaned up along the way: `src/parent/dashboard.js`'s private `emojiForType` helper is promoted to an exported function in `src/shared/badges.js` (the module that already owns badge emoji data), so both the parent dashboard and the new help feature share one source of truth. `src/child/ui.js` gains a private `helpOverlayHtml` renderer and new `showHelp`/`onOpenHelp`/`onCloseHelp` parameters on its 3 question-rendering functions. `src/child/main.js` tracks help-visibility as simple module state and re-renders the current screen when it toggles.

**Tech Stack:** Vanilla JavaScript, Vitest.

---

### Task 1: Help content module (TDD)

**Files:**
- Create: `src/shared/helpContent.js`
- Test: `tests/shared/helpContent.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/helpContent.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { HELP_TEXT, helpTextForType } from '../../src/shared/helpContent.js';

describe('HELP_TEXT', () => {
  it('defines a help text for each of the 6 question types, in a fixed order', () => {
    expect(Object.keys(HELP_TEXT)).toEqual([
      'addition',
      'soustraction',
      'multiplication',
      'comparaison',
      'division',
      'fraction',
    ]);
  });
});

describe('helpTextForType', () => {
  it('returns the exact text defined in HELP_TEXT for each known type', () => {
    Object.keys(HELP_TEXT).forEach((type) => {
      expect(helpTextForType(type)).toBe(HELP_TEXT[type]);
    });
  });

  it('returns a fallback message for an unknown type', () => {
    expect(helpTextForType('unknown')).toBe("Pas d'aide disponible pour cette notion.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/helpContent.test.js`
Expected: FAIL — cannot find module `../../src/shared/helpContent.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/helpContent.js`:

```js
export const HELP_TEXT = {
  addition:
    "Additionner, c'est ajouter deux nombres ensemble. Commence par les unités (les chiffres de droite). Si le total dépasse 9, retiens 1 dizaine et ajoute-la à la colonne suivante.",
  soustraction:
    "Soustraire, c'est enlever un nombre à un autre. Commence par les unités. Si tu ne peux pas soustraire (le chiffre du haut est plus petit), emprunte 1 dizaine au nombre suivant.",
  multiplication:
    "Multiplier, c'est additionner plusieurs fois le même nombre. Par exemple, 4 × 3 veut dire 4 + 4 + 4. Tu peux aussi utiliser tes tables de multiplication !",
  comparaison:
    "Pour comparer deux nombres, regarde d'abord combien de chiffres ils ont : le nombre avec le plus de chiffres est le plus grand. S'ils ont autant de chiffres, compare-les de gauche à droite, chiffre par chiffre.",
  division:
    "Diviser, c'est partager un nombre en parts égales. Par exemple, 12 ÷ 3 veut dire : combien de fois 3 rentre dans 12 ? Tu peux t'aider de tes tables de multiplication à l'envers !",
  fraction:
    "Pour comparer deux fractions, regarde le numérateur (le chiffre du haut) : si les dénominateurs (le chiffre du bas) sont pareils, la fraction avec le plus grand numérateur est la plus grande.",
};

export function helpTextForType(type) {
  return HELP_TEXT[type] ?? "Pas d'aide disponible pour cette notion.";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/helpContent.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/helpContent.js tests/shared/helpContent.test.js
git commit -m "feat: add help text content for the 6 question types (TDD)"
```

---

### Task 2: Extract `emojiForType` into the shared badges module (TDD)

**Files:**
- Modify: `src/shared/badges.js`
- Modify: `src/parent/dashboard.js`
- Modify: `tests/shared/badges.test.js`

The current content of `tests/shared/badges.test.js` is:

```js
import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 12 badges with a category, in a fixed order', () => {
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
    const result = badgeMedallionData(['streak-3', 'mastery-division']);
    expect(result).toHaveLength(12);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-division')).toMatchObject({ earned: true });
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

  it('renders the new division and fraction mastery badges when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-division', 'mastery-fraction']);
    expect(html).toContain('➗');
    expect(html).toContain('🍕');
  });
});
```

- [ ] **Step 1: Write the failing test**

Change the import line at the top of `tests/shared/badges.test.js` from:

```js
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';
```

to:

```js
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml, emojiForType } from '../../src/shared/badges.js';
```

Then append this new `describe` block at the end of the file (after the existing `renderBadgeMedallionsHtml` block):

```js

describe('emojiForType', () => {
  it('returns the correct emoji for each of the 6 mastery types', () => {
    expect(emojiForType('addition')).toBe('➕');
    expect(emojiForType('soustraction')).toBe('➖');
    expect(emojiForType('multiplication')).toBe('✖️');
    expect(emojiForType('comparaison')).toBe('⚖️');
    expect(emojiForType('division')).toBe('➗');
    expect(emojiForType('fraction')).toBe('🍕');
  });

  it('returns the fallback emoji for an unknown type', () => {
    expect(emojiForType('unknown')).toBe('❓');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: FAIL — `emojiForType` is not exported from `src/shared/badges.js`

- [ ] **Step 3: Write minimal implementation**

The current content of `src/shared/badges.js` is:

```js
export const BADGES = [
  { id: 'streak-3', category: 'streak', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', category: 'streak', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', category: 'streak', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
  { id: 'mastery-addition', category: 'maitrise', emoji: '➕', label: 'Addition maîtrisée', gradient: ['#a8e6cf', '#dcedc1'] },
  { id: 'mastery-soustraction', category: 'maitrise', emoji: '➖', label: 'Soustraction maîtrisée', gradient: ['#ffaaa5', '#ffd3b6'] },
  { id: 'mastery-multiplication', category: 'maitrise', emoji: '✖️', label: 'Multiplication maîtrisée', gradient: ['#a2d2ff', '#bde0fe'] },
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'mastery-division', category: 'maitrise', emoji: '➗', label: 'Division maîtrisée', gradient: ['#ffe5a0', '#ffcb77'] },
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Fractions maîtrisées', gradient: ['#4ecdc4', '#a0e7e5'] },
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

Append this new exported function at the end of the file:

```js

export function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/shared/badges.test.js`
Expected: PASS (11 tests: 9 existing + 2 new `emojiForType` tests)

- [ ] **Step 5: Update `src/parent/dashboard.js` to use the shared export**

Find:

```js
import { BADGES, renderBadgeMedallionsHtml } from '../shared/badges.js';
```

Replace with:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
```

(`BADGES` is no longer imported directly — it was only used by the private `emojiForType` below, which is being removed.)

Find and delete this private function entirely:

```js
function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
```

Nothing else in `src/parent/dashboard.js` changes — `renderDashboard` already calls `emojiForType(type)` exactly as before, it just now resolves to the imported function instead of the local one.

- [ ] **Step 6: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all test files pass (no new tests from this step, `dashboard.test.js` doesn't test `emojiForType` directly — it was never exported/tested there).

- [ ] **Step 7: Commit**

```bash
git add src/shared/badges.js src/parent/dashboard.js tests/shared/badges.test.js
git commit -m "refactor: extract emojiForType into shared badges module (TDD)"
```

---

### Task 3: CSS for the help button and overlay

**Files:**
- Modify: `src/child/style.css`

- [ ] **Step 1: Append to the end of `src/child/style.css`**

```css

.help-button {
  position: absolute;
  top: 12px;
  left: 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  z-index: 50;
}

.help-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  text-align: left;
}

.help-entry {
  margin-bottom: 16px;
}

.help-entry h3 {
  margin-bottom: 4px;
}
```

`.help-button` mirrors the existing `.sound-toggle` positioning pattern (both rely on the already-existing `.screen { position: relative; }` rule) but sits on the opposite corner (`left` instead of `right`) so the two buttons never overlap. `.help-overlay` is a fixed full-viewport backdrop that sits above all mission content (`z-index: 50`) and, being a solid element covering the whole screen, blocks clicks from reaching the question/tiles underneath. `.help-card` is the centered white content box; `.help-entry` styles each notion's title+text block in the pairs-mode "all notions" view.

- [ ] **Step 2: Commit**

```bash
git add src/child/style.css
git commit -m "feat: add styles for the help button and overlay"
```

---

### Task 4: Help overlay rendering and question-screen wiring

**Files:**
- Modify: `src/child/ui.js`

The current content of `src/child/ui.js` is:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';

export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions de Luna</h1>
      <p>Un parent doit entrer le code d'appairage et le code secret.</p>
      <form id="pairing-form">
        <label>Code d'appairage<input id="family-id" type="text" autocomplete="off" required /></label>
        <label>Code secret (4 chiffres)<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        ${error ? '<p class="error" id="pairing-error"></p>' : ''}
        <button type="submit" class="big-button">Valider</button>
      </form>
    </div>
  `;
  if (error) {
    root.querySelector('#pairing-error').textContent = error;
  }
  root.querySelector('#pairing-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const familyId = root.querySelector('#family-id').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    onSubmit({ familyId, pin });
  });
}

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

export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder }) {
  const isComparison = question.type === 'comparaison' || question.type === 'fraction';
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

export function renderConnectionError(root, { onRetry }) {
  root.innerHTML = `
    <div class="screen error-screen">
      <h1>🌥️ Petit souci de connexion</h1>
      <p>Vérifie le Wi-Fi et réessaie.</p>
      <button id="retry" class="big-button">Réessayer</button>
    </div>
  `;
  root.querySelector('#retry').addEventListener('click', onRetry);
}
```

- [ ] **Step 1: Update imports and add the private `helpOverlayHtml` helper**

Replace the top import line:

```js
import { renderBadgeMedallionsHtml } from '../shared/badges.js';
```

with:

```js
import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
```

Insert this new private function right before `export function renderQuestion` (after `renderCustomize`):

```js
function helpOverlayHtml(type) {
  if (type === null) {
    return `
      <div class="help-overlay">
        <div class="help-card">
          <h2>❓ Aide</h2>
          ${Object.keys(HELP_TEXT)
            .map(
              (t) => `
            <div class="help-entry">
              <h3>${emojiForType(t)} ${t}</h3>
              <p>${helpTextForType(t)}</p>
            </div>`
            )
            .join('')}
          <button id="help-close" class="big-button">Fermer</button>
        </div>
      </div>`;
  }
  return `
    <div class="help-overlay">
      <div class="help-card">
        <h2>${emojiForType(type)} Aide</h2>
        <p>${helpTextForType(type)}</p>
        <button id="help-close" class="big-button">Fermer</button>
      </div>
    </div>`;
}
```

- [ ] **Step 2: Update `renderQuestion`**

Replace the full function with:

```js
export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const isComparison = question.type === 'comparaison' || question.type === 'fraction';
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
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
      ${showHelp ? helpOverlayHtml(question.type) : ''}
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
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}
```

- [ ] **Step 3: Update `renderQuestionQcm`**

Replace the full function with:

```js
export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
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
      ${showHelp ? helpOverlayHtml(question.type) : ''}
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}
```

- [ ] **Step 4: Update `renderPairsRound`**

Replace the full function with:

```js
export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch, showHelp, onOpenHelp, onCloseHelp }) {
  let selectedCalcId = null;

  function draw() {
    const remainingCalc = round.calcTiles.filter((t) => !round.matchedCalcIds.has(t.id));
    const remainingResult = round.resultTiles.filter((t) => !round.matchedResultIds.has(t.id));
    root.innerHTML = `
      <div class="screen mission-screen pairs-screen">
        <button id="help-button" class="help-button" aria-label="Aide">❓</button>
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
        ${showHelp ? helpOverlayHtml(null) : ''}
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
    root.querySelector('#help-button').addEventListener('click', onOpenHelp);
    if (showHelp) {
      root.querySelector('#help-close').addEventListener('click', onCloseHelp);
    }
  }

  draw();
}
```

`renderPairing`, `renderHome`, `customizeMedallionHtml`, `renderCustomize`, `renderResults`, and `renderConnectionError` are all unchanged.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: all existing tests still pass unchanged (this task adds no new tests — `ui.js`'s rendering functions aren't unit-tested in this project, consistent with `renderHome`/`renderCustomize`).

- [ ] **Step 6: Commit**

```bash
git add src/child/ui.js
git commit -m "feat: render help overlay in question, QCM, and pairs screens"
```

---

### Task 5: Wire help state into child orchestration

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
let helpVisible = false;

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

function rerenderCurrentScreen() {
  if (missionMode === 'pairs') {
    showPairsRound();
  } else {
    showQuestion();
  }
}

function openHelp() {
  helpVisible = true;
  rerenderCurrentScreen();
}

function closeHelp() {
  helpVisible = false;
  rerenderCurrentScreen();
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
  helpVisible = false;
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
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
    });
  } else {
    renderQuestion(root, {
      question,
      index: session.index,
      total: session.questions.length,
      feedback: lastFeedback,
      showPauseReminder,
      onAnswer: handleAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
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
    showHelp: helpVisible,
    onOpenHelp: openHelp,
    onCloseHelp: closeHelp,
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

`startMission`, `handleAnswer`, `handlePairsMatch`, `finishMission`, `handlePairing`, `start`, the service worker registration, and the final `start()` call keep their existing bodies except for the single added `helpVisible = false;` line in `startMission`. `showQuestion` and `showPairsRound` each gain 3 new fields (`showHelp`, `onOpenHelp`, `onCloseHelp`) passed to their render calls. Three new functions are added: `rerenderCurrentScreen`, `openHelp`, `closeHelp`.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all test files green (159 tests total: 154 existing + 3 from Task 1 + 2 from Task 2)

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: builds without errors

- [ ] **Step 4: Commit**

```bash
git add src/child/main.js
git commit -m "feat: wire help button into child app orchestration"
```

---

### Task 6: Manual verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all test files pass, 159 tests total.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`. Open the child app (`http://localhost:5173/`, already paired from prior testing).

- [ ] **Step 3: Verify the help button in classic quiz mode**

Start a mission until it lands on classic quiz mode (or replay until it does — mode is randomized). Confirm the "❓" button is visible in the top-left corner, tapping it shows an overlay with the emoji + explanation text matching the current question's notion, and "Fermer" closes it and returns to the exact same question (no answer lost, no question skipped).

- [ ] **Step 4: Verify the help button in QCM mode**

Same check as Step 3, but for the QCM format (multiple-choice buttons).

- [ ] **Step 5: Verify the help button in pairs mode**

Confirm the "❓" button opens an overlay listing all 6 notions with their emoji and explanation, scrollable if needed, and "Fermer" returns to the pairs board with the same tiles/matches intact.

- [ ] **Step 6: Verify help doesn't affect scoring**

Open help, close it without answering, then answer correctly — confirm the mission completes normally with the same XP/badge behavior as without ever opening help (no separate code path was taken).

- [ ] **Step 7: Verify the parent dashboard still works**

Open `http://localhost:5173/parent.html`, sign in, and confirm the dashboard renders exactly as before (breakdown list, weekly progress heat-map with correct emoji per notion) — checks that the `emojiForType` extraction in Task 2 didn't break anything.

- [ ] **Step 8: Build and deploy**

Run: `npm run build && firebase deploy --only hosting`
Expected: deploy succeeds. Re-verify steps 3-5 against the live URL (close/reopen the tab once to pick up the new deploy, per the service worker's network-first navigation strategy).
