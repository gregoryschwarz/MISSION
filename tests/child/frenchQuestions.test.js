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

describe('French manual catalogue', () => {
  it('contains broad word banks for every difficulty family', () => {
    expect(REGULAR_WORDS.length).toBeGreaterThanOrEqual(15);
    expect(X_PLURAL_WORDS.length).toBeGreaterThanOrEqual(15);
    expect(INVARIABLE_WORDS.length).toBeGreaterThanOrEqual(10);
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

  it('does not ask the same singular or plural question twice in one series', () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const mission = generateFrenchMission(10, { 'accord-pluriel': 1 });
      expect(new Set(mission.map((question) => question.prompt)).size).toBe(10);
    }
  });
});
