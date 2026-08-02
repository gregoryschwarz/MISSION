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
