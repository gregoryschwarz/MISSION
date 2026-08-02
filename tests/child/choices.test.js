import { describe, it, expect } from 'vitest';
import { generateChoices } from '../../src/child/choices.js';

describe('generateChoices', () => {
  it('returns exactly [">", "<"] for comparaison questions', () => {
    const question = { type: 'comparaison', a: 5, b: 8, answer: '<', prompt: '5 ___ 8', options: ['>', '<'] };
    expect(generateChoices(question)).toEqual(['>', '<']);
  });

  it('includes the correct answer among 3 distinct, non-negative choices for addition', () => {
    const question = { type: 'addition', a: 20, b: 30, answer: 50, prompt: '20 + 30' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(50);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('includes the correct answer among 3 distinct, non-negative choices for subtraction near zero', () => {
    const question = { type: 'soustraction', a: 10, b: 9, answer: 1, prompt: '10 - 9' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(1);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('includes the correct answer among 3 distinct, non-negative choices for multiplication', () => {
    const question = { type: 'multiplication', a: 2, b: 3, answer: 6, prompt: '2 x 3' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      expect(choices).toHaveLength(3);
      expect(choices).toContain(6);
      expect(new Set(choices).size).toBe(3);
      choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    }
  });

  it('keeps distractors within a close range (±5) of the correct answer', () => {
    const question = { type: 'addition', a: 20, b: 30, answer: 50, prompt: '20 + 30' };
    for (let i = 0; i < 30; i++) {
      const choices = generateChoices(question);
      choices.forEach((c) => expect(Math.abs(c - 50)).toBeLessThanOrEqual(5));
    }
  });
});
