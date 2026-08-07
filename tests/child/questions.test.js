import { describe, it, expect } from 'vitest';
import {
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateComparison,
  generateDivision,
  generateFraction,
  generateGeometry,
  generateMoney,
  generateLength,
  generateTime,
  generateMission,
} from '../../src/child/questions.js';
import { SHAPES, shapeSides } from '../../src/child/shapes.js';
import { COINS } from '../../src/child/money.js';
import { formatTime } from '../../src/child/clock.js';

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

  it('never produces a trivial b === a (answer of 0), even across many draws', () => {
    for (let i = 0; i < 500; i++) {
      const q = generateSubtraction();
      expect(q.b).not.toBe(q.a);
      expect(q.answer).toBeGreaterThan(0);
    }
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

describe('generateDivision', () => {
  it('is always an exact division at level 1 (default), using tables 2/5/10', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision();
      expect(q.type).toBe('division');
      expect(q.answer * q.b).toBe(q.a);
      expect([2, 5, 10]).toContain(q.b);
    }
  });

  it('adds tables 3 and 4 at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision(2);
      expect(q.answer * q.b).toBe(q.a);
      expect([2, 3, 4, 5, 10]).toContain(q.b);
    }
  });

  it('uses any table from 2 to 10 at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDivision(3);
      expect(q.answer * q.b).toBe(q.a);
      expect(q.b).toBeGreaterThanOrEqual(2);
      expect(q.b).toBeLessThanOrEqual(10);
    }
  });
});

describe('generateFraction', () => {
  it('uses denominator 3 or 4 at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction();
      expect(q.type).toBe('fraction');
      expect([3, 4]).toContain(q.a.denominator);
      expect(q.a.denominator).toBe(q.b.denominator);
      expect(q.a.numerator).not.toBe(q.b.numerator);
      expect(q.a.numerator).toBeLessThan(q.a.denominator);
      expect(q.b.numerator).toBeLessThan(q.b.denominator);
      const expectedAnswer = q.a.numerator > q.b.numerator ? '>' : '<';
      expect(q.answer).toBe(expectedAnswer);
      expect(q.options).toEqual(['>', '<']);
    }
  });

  it('adds denominator 6 at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction(2);
      expect([3, 4, 6]).toContain(q.a.denominator);
    }
  });

  it('uses denominators up to 10 at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateFraction(3);
      expect([3, 4, 6, 8, 10]).toContain(q.a.denominator);
    }
  });
});

describe('generateGeometry', () => {
  it('picks only from triangle, carre, cercle at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry();
      expect(q.type).toBe('geometrie');
      expect(['triangle', 'carre', 'cercle']).toContain(q.shape);
      expect(q.answer).toBe(shapeSides(q.shape));
    }
  });

  it('adds rectangle and losange at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(2);
      expect(['triangle', 'carre', 'cercle', 'rectangle', 'losange']).toContain(q.shape);
    }
  });

  it('adds pentagone and hexagone at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(3);
      expect(Object.keys(SHAPES)).toContain(q.shape);
    }
  });

  it('always answers with the real side count of the drawn shape', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateGeometry(3);
      expect(q.answer).toBe(SHAPES[q.shape].sides);
    }
  });
});

describe('generateMoney', () => {
  it('draws 2 coins/billets at level 1 (default)', () => {
    const q = generateMoney();
    expect(q.type).toBe('monnaie');
    expect(q.items).toHaveLength(2);
  });

  it('draws 3 coins/billets at level 2', () => {
    expect(generateMoney(2).items).toHaveLength(3);
  });

  it('draws 4 coins/billets at level 3', () => {
    expect(generateMoney(3).items).toHaveLength(4);
  });

  it('always answers with the real sum of the drawn items, in centimes', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateMoney(3);
      const expectedSum = q.items.reduce((sum, id) => sum + COINS[id].value, 0);
      expect(q.answer).toBe(expectedSum);
    }
  });

  it('only draws known coin/billet ids', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateMoney(3);
      q.items.forEach((id) => expect(Object.keys(COINS)).toContain(id));
    }
  });
});

describe('generateLength', () => {
  it('never produces equal lengths', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateLength();
      expect(q.a).not.toBe(q.b);
    }
  });

  it('respects the minimum gap of 5cm at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateLength();
      expect(Math.abs(q.a - q.b)).toBeGreaterThanOrEqual(5);
    }
  });

  it('respects the minimum gap of 3cm at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateLength(2);
      expect(Math.abs(q.a - q.b)).toBeGreaterThanOrEqual(3);
    }
  });

  it('respects the minimum gap of 1cm at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateLength(3);
      expect(Math.abs(q.a - q.b)).toBeGreaterThanOrEqual(1);
    }
  });

  it('answers with the correct comparison symbol and fixed options', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateLength();
      const expected = q.a > q.b ? '>' : '<';
      expect(q.answer).toBe(expected);
      expect(q.options).toEqual(['>', '<']);
    }
  });
});

describe('generateTime', () => {
  it('always keeps hour12 within 1-12', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime(3);
      expect(q.hour12).toBeGreaterThanOrEqual(1);
      expect(q.hour12).toBeLessThanOrEqual(12);
    }
  });

  it('only uses morning hours (1h-11h) at level 1 (default)', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime();
      expect(q.hour24).toBeGreaterThanOrEqual(1);
      expect(q.hour24).toBeLessThanOrEqual(11);
    }
  });

  it('adds midday (12h) at level 2', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime(2);
      expect(q.hour24).toBeGreaterThanOrEqual(1);
      expect(q.hour24).toBeLessThanOrEqual(12);
    }
  });

  it('adds afternoon hours (13h-23h) at level 3', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime(3);
      expect(q.hour24).toBeGreaterThanOrEqual(1);
      expect(q.hour24).toBeLessThanOrEqual(23);
    }
  });

  it('only uses whole or half hours', () => {
    for (let i = 0; i < 30; i++) {
      expect([0, 30]).toContain(generateTime(3).minute);
    }
  });

  it('formats the answer to match hour24 and minute', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime(3);
      expect(q.answer).toBe(formatTime(q.hour24, q.minute));
    }
  });

  it('includes the correct answer among 3 unique options', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateTime(3);
      expect(q.options).toHaveLength(3);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(3);
    }
  });
});

describe('generateMission', () => {
  it('generates the requested number of questions', () => {
    expect(generateMission(10)).toHaveLength(10);
  });

  it('only uses known question types', () => {
    const mission = generateMission(12);
    const allowed = [
      'addition', 'soustraction', 'multiplication', 'comparaison', 'division',
      'fraction', 'geometrie', 'monnaie', 'longueur', 'temps',
    ];
    mission.forEach((q) => expect(allowed).toContain(q.type));
  });

  it('cycles through all 10 types when given enough questions', () => {
    const mission = generateMission(10);
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual([
      'addition',
      'comparaison',
      'division',
      'fraction',
      'geometrie',
      'longueur',
      'monnaie',
      'multiplication',
      'soustraction',
      'temps',
    ]);
  });

  it("passes each type's difficulty level through to its generator", () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateMission(6, {
        addition: 1,
        soustraction: 1,
        multiplication: 3,
        comparaison: 1,
        division: 1,
        fraction: 1,
      });
      const multiplication = mission.find((q) => q.type === 'multiplication');
      tablesSeen.push(multiplication.a);
    }
    // Level 3 multiplication can use tables 3, 4, 6, 7, 8, 9 — none of which level 1 ever produces (level 1 is limited to 2, 5, 10).
    // Over 50 draws, the chance of never seeing one of these is astronomically small, so this reliably proves the level was passed through.
    expect(tablesSeen.some((table) => [3, 4, 6, 7, 8, 9].includes(table))).toBe(true);
  });
});

describe('generateMission with a focusType', () => {
  it('makes 7 of 10 questions the focus type', () => {
    const mission = generateMission(10, undefined, 'division');
    const divisionCount = mission.filter((q) => q.type === 'division').length;
    expect(divisionCount).toBe(7);
  });

  it('cycles the other 5 types in catalogue order for the remainder', () => {
    const mission = generateMission(10, undefined, 'division');
    const others = mission.filter((q) => q.type !== 'division').map((q) => q.type).sort();
    expect(others).toEqual(['addition', 'multiplication', 'soustraction']);
  });

  it('falls back to the normal round-robin mix when focusType is null', () => {
    const mission = generateMission(6, undefined, null);
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual(['addition', 'comparaison', 'division', 'fraction', 'multiplication', 'soustraction']);
  });

  it('falls back to the normal round-robin mix for an unknown focusType', () => {
    const mission = generateMission(6, undefined, 'not-a-real-type');
    const types = mission.map((q) => q.type).sort();
    expect(types).toEqual(['addition', 'comparaison', 'division', 'fraction', 'multiplication', 'soustraction']);
  });

  it("passes the focus type's difficulty level through to its generator", () => {
    const tablesSeen = [];
    for (let i = 0; i < 50; i++) {
      const mission = generateMission(
        10,
        { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 3, fraction: 1 },
        'division'
      );
      mission.filter((q) => q.type === 'division').forEach((q) => tablesSeen.push(q.b));
    }
    // Level 3 division can use tables 3, 4, 6, 7, 8, 9 — none of which level 1 ever produces (level 1 is limited to 2, 5, 10).
    expect(tablesSeen.some((table) => [3, 4, 6, 7, 8, 9].includes(table))).toBe(true);
  });
});
