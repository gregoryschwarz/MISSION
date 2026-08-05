import { describe, it, expect } from 'vitest';
import { aggregateBreakdown, weeklyBreakdownByType, colorForPercent } from '../../src/parent/dashboard.js';

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

describe('weeklyBreakdownByType', () => {
  const referenceDate = new Date('2026-08-05T00:00:00Z');

  it("builds an 8-week window ending on the reference date's week, oldest first", () => {
    const sessions = [{ date: '2026-08-03', breakdown: { addition: { correct: 3, total: 4 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.addition.map((w) => w.weekLabel)).toEqual([
      '15/06', '22/06', '29/06', '06/07', '13/07', '20/07', '27/07', '03/08',
    ]);
  });

  it('groups a session into the correct calendar week (Monday-Sunday)', () => {
    const sessions = [
      { date: '2026-08-02', breakdown: { addition: { correct: 1, total: 1 } } }, // Sunday -> week of 27/07
      { date: '2026-08-03', breakdown: { addition: { correct: 1, total: 1 } } }, // Monday -> week of 03/08
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const byLabel = Object.fromEntries(result.addition.map((w) => [w.weekLabel, w.percent]));
    expect(byLabel['27/07']).toBe(100);
    expect(byLabel['03/08']).toBe(100);
  });

  it('returns percent: null for a week with no session for that type', () => {
    const sessions = [{ date: '2026-08-03', breakdown: { addition: { correct: 3, total: 4 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const byLabel = Object.fromEntries(result.addition.map((w) => [w.weekLabel, w.percent]));
    expect(byLabel['27/07']).toBe(null);
    expect(byLabel['03/08']).toBe(75);
  });

  it('ignores sessions older than the 8-week window but still lists the type with null weeks', () => {
    const sessions = [{ date: '2026-06-01', breakdown: { multiplication: { correct: 2, total: 2 } } }];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.multiplication).toBeDefined();
    result.multiplication.forEach((w) => expect(w.percent).toBe(null));
  });

  it('aggregates multiple sessions in the same week for the same type', () => {
    const sessions = [
      { date: '2026-08-03', breakdown: { addition: { correct: 3, total: 5 } } },
      { date: '2026-08-04', breakdown: { addition: { correct: 4, total: 5 } } },
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const currentWeek = result.addition.find((w) => w.weekLabel === '03/08');
    expect(currentWeek.percent).toBe(70);
  });

  it('tracks different types independently, each with 8 entries', () => {
    const sessions = [
      {
        date: '2026-08-03',
        breakdown: { addition: { correct: 1, total: 1 }, soustraction: { correct: 0, total: 1 } },
      },
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    expect(result.addition).toHaveLength(8);
    expect(result.soustraction).toHaveLength(8);
    const additionCurrent = result.addition.find((w) => w.weekLabel === '03/08');
    const soustractionCurrent = result.soustraction.find((w) => w.weekLabel === '03/08');
    expect(additionCurrent.percent).toBe(100);
    expect(soustractionCurrent.percent).toBe(0);
  });

  it('returns an empty object for no sessions', () => {
    expect(weeklyBreakdownByType([], { referenceDate })).toEqual({});
  });
});

describe('colorForPercent', () => {
  it('returns the "no data" color for null', () => {
    expect(colorForPercent(null)).toBe('#e5e0f5');
  });

  it('returns red below 50%', () => {
    expect(colorForPercent(0)).toBe('#ffb4a2');
    expect(colorForPercent(49)).toBe('#ffb4a2');
  });

  it('returns yellow/orange between 50% and 74%', () => {
    expect(colorForPercent(50)).toBe('#ffe5a0');
    expect(colorForPercent(74)).toBe('#ffe5a0');
  });

  it('returns green at 75% and above', () => {
    expect(colorForPercent(75)).toBe('#c8f0c8');
    expect(colorForPercent(100)).toBe('#c8f0c8');
  });
});
