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
