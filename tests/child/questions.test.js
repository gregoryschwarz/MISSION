import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateMission,
} from '../../src/child/questions.js';

function digitsReversed(n) {
  return String(n).split('').map(Number).reverse();
}

describe('generateAddition', () => {
  it('returns a correct sum under 100 at level 1 (default)', () => {
    const q = generateAddition();
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(100);
  });

  it('returns a correct sum under 200 at level 2', () => {
    const q = generateAddition(2);
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(200);
  });

  it('returns a correct sum under 999 at level 3', () => {
    const q = generateAddition(3);
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a + q.b).toBeLessThan(999);
  });
});

describe('generateSubtraction', () => {
  it('returns a correct, positive difference under 100 with no borrowing at level 1', () => {
    const q = generateSubtraction();
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeLessThan(100);
    const aDigits = digitsReversed(q.a);
    digitsReversed(q.b).forEach((d, i) => expect(d).toBeLessThanOrEqual(aDigits[i] ?? 0));
  });

  it('returns a correct, positive difference under 200 with no borrowing at level 2', () => {
    const q = generateSubtraction(2);
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeLessThan(200);
    const aDigits = digitsReversed(q.a);
    digitsReversed(q.b).forEach((d, i) => expect(d).toBeLessThanOrEqual(aDigits[i] ?? 0));
  });

  it('allows borrowing with numbers between 100 and 999 at level 3', () => {
    const q = generateSubtraction(3);
    expect(q.answer).toBe(q.a - q.b);
    expect(q.answer).toBeGreaterThan(0);
    expect(q.a).toBeGreaterThanOrEqual(100);
    expect(q.a).toBeLessThan(999);
  });
});

describe('generateMultiplication', () => {
  it('uses the table 2, 5, or 10 at level 1 (default)', () => {
    const q = generateMultiplication();
    expect([2, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });

  it('adds tables 3 and 4 at level 2', () => {
    const q = generateMultiplication(2);
    expect([2, 3, 4, 5, 10]).toContain(q.a);
    expect(q.answer).toBe(q.a * q.b);
  });

  it('uses any table from 2 to 10 at level 3', () => {
    const q = generateMultiplication(3);
    expect(q.a).toBeGreaterThanOrEqual(2);
    expect(q.a).toBeLessThanOrEqual(10);
    expect(q.answer).toBe(q.a * q.b);
  });
});

describe('generateComparison', () => {
  it('picks the correct comparison symbol under 100 at level 1 (default)', () => {
    const q = generateComparison();
    expect(q.a).not.toBe(q.b);
    expect(q.a).toBeLessThan(100);
    expect(q.b).toBeLessThan(100);
    if (q.a > q.b) expect(q.answer).toBe('>');
    else expect(q.answer).toBe('<');
  });

  it('uses numbers under 500 at level 2', () => {
    const q = generateComparison(2);
    expect(q.a).toBeLessThan(500);
    expect(q.b).toBeLessThan(500);
  });

  it('uses numbers under 999 at level 3', () => {
    const q = generateComparison(3);
    expect(q.a).toBeLessThan(999);
    expect(q.b).toBeLessThan(999);
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

  it("passes each type's difficulty level through to its generator", () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateMission(4, { addition: 1, soustraction: 1, multiplication: 3, comparaison: 1 });
      const multiplication = mission.find((q) => q.type === 'multiplication');
      tablesSeen.push(multiplication.a);
    }
    // Level 3 multiplication can use tables 3, 4, 6, 7, 8, 9 — none of which level 1 ever produces (level 1 is limited to 2, 5, 10).
    // Over 50 draws, the chance of never seeing one of these is astronomically small, so this reliably proves the level was passed through.
    expect(tablesSeen.some((table) => [3, 4, 6, 7, 8, 9].includes(table))).toBe(true);
  });
});
