import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateMission,
} from '../../src/child/questions.js';

describe('generateAddition', () => {
  it('returns a correct sum under 100', () => {
    const q = generateAddition();
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(100);
  });
});

describe('generateSubtraction', () => {
  it('returns a correct, non-negative difference with no borrowing', () => {
    const q = generateSubtraction();
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.a).toBeLessThan(100);
    const aUnits = q.a % 10;
    const aTens = Math.floor(q.a / 10);
    const bUnits = q.b % 10;
    const bTens = Math.floor(q.b / 10);
    expect(bUnits).toBeLessThanOrEqual(aUnits);
    expect(bTens).toBeLessThanOrEqual(aTens);
  });
});

describe('generateMultiplication', () => {
  it('uses the table 2, 5, or 10', () => {
    const q = generateMultiplication();
    expect([2, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });
});

describe('generateComparison', () => {
  it('picks the correct comparison symbol within bounds', () => {
    const q = generateComparison();
    expect(q.a).not.toBe(q.b);
    expect(q.a).toBeLessThan(100);
    expect(q.b).toBeLessThan(100);
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
