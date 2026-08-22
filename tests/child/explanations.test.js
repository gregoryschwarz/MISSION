import { describe, expect, it } from 'vitest';
import { shortAnswerExplanation } from '../../src/child/hints.js';

describe('short answer explanations', () => {
  it('explains a calculation instead of only revealing its result', () => {
    expect(shortAnswerExplanation({ type: 'addition', a: 27, b: 15, answer: 42 })).toContain('27 + 15 = 42');
  });

  it('gives a concise learning sentence for a knowledge question', () => {
    expect(shortAnswerExplanation({ type: 'sciences', answer: 'le cœur' })).toBe('À retenir : la bonne réponse est « le cœur ».');
  });
});
