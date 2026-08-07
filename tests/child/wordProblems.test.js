import { describe, it, expect } from 'vitest';
import { NAMES, OBJECTS, ADDITION_TEMPLATES, SUBTRACTION_TEMPLATES, wordProblemText } from '../../src/child/wordProblems.js';

describe('wordProblemText', () => {
  it('produces a non-empty addition statement containing both numbers', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 12, 5);
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('12');
      expect(text).toContain('5');
    }
  });

  it('produces a non-empty subtraction statement containing both numbers', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('soustraction', 20, 7);
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('20');
      expect(text).toContain('7');
    }
  });

  it('never leaves an unfilled template placeholder', () => {
    for (let i = 0; i < 30; i++) {
      expect(wordProblemText('addition', 10, 3)).not.toMatch(/[{}]/);
      expect(wordProblemText('soustraction', 10, 3)).not.toMatch(/[{}]/);
    }
  });

  it('always starts with an uppercase letter', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 8, 2);
      expect(text[0]).toBe(text[0].toUpperCase());
    }
  });

  it('only uses names and objects from the known catalogues', () => {
    for (let i = 0; i < 30; i++) {
      const text = wordProblemText('addition', 9, 4);
      const nameFound = NAMES.some((n) => text.includes(n.name));
      const objectFound = OBJECTS.some((o) => text.includes(o));
      expect(nameFound || objectFound).toBe(true);
    }
  });

  it('the pronoun-driven addition templates agree "a-t-elle"/"a-t-il" with the given pronoun', () => {
    [ADDITION_TEMPLATES[0], ADDITION_TEMPLATES[1]].forEach((template) => {
      const withElle = template('Léa', 'elle', 'bonbons', 5, 3);
      expect(withElle).toContain('a-t-elle');
      expect(withElle).not.toContain('a-t-il');
      const withIl = template('Tom', 'il', 'bonbons', 5, 3);
      expect(withIl).toContain('a-t-il');
      expect(withIl).not.toContain('a-t-elle');
    });
  });

  it('the pronoun-driven subtraction templates capitalize "Elle"/"Il" consistently with the given pronoun', () => {
    [SUBTRACTION_TEMPLATES[0], SUBTRACTION_TEMPLATES[1]].forEach((template) => {
      const withElle = template('Léa', 'elle', 'bonbons', 5, 3);
      expect(withElle).toContain('Elle en');
      expect(withElle).not.toContain('Il en');
      const withIl = template('Tom', 'il', 'bonbons', 5, 3);
      expect(withIl).toContain('Il en');
      expect(withIl).not.toContain('Elle en');
    });
  });
});
