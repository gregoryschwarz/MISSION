import { describe, it, expect } from 'vitest';
import {
  aggregateBreakdown,
  weeklyBreakdownByType,
  dailyBreakdownByType,
  colorForPercent,
  computeInsights,
  computeWeeklyWatch,
  dailyActivityLast7Days,
  dailyActivityChartSvg,
} from '../../src/parent/dashboard.js';

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

describe('dailyBreakdownByType', () => {
  const referenceDate = new Date('2026-08-16T12:00:00Z');

  it('builds a seven-day window with a column for each day', () => {
    const result = dailyBreakdownByType([
      { date: '2026-08-16', breakdown: { addition: { correct: 3, total: 4 } } },
    ], { referenceDate });
    expect(result.addition.map((day) => day.dayLabel)).toEqual([
      'lun 10/08', 'mar 11/08', 'mer 12/08', 'jeu 13/08', 'ven 14/08', 'sam 15/08', 'dim 16/08',
    ]);
    expect(result.addition.at(-1).percent).toBe(75);
  });

  it('combines several sessions completed on the same day', () => {
    const result = dailyBreakdownByType([
      { date: '2026-08-15', breakdown: { addition: { correct: 2, total: 5 } } },
      { date: '2026-08-15', breakdown: { addition: { correct: 4, total: 5 } } },
    ], { referenceDate });
    expect(result.addition.find((day) => day.dayLabel === 'sam 15/08').percent).toBe(60);
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

  it('does not merge sessions from a prior year that share the same dd/mm week label', () => {
    const sessions = [
      { date: '2026-08-03', breakdown: { addition: { correct: 1, total: 1 } } },
      { date: '2020-08-03', breakdown: { addition: { correct: 0, total: 9 } } },
    ];
    const result = weeklyBreakdownByType(sessions, { referenceDate });
    const currentWeek = result.addition.find((w) => w.weekLabel === '03/08');
    expect(currentWeek.percent).toBe(100);
  });
});

describe('computeInsights', () => {
  it('returns nulls when no notion has enough attempts', () => {
    const sessions = [{ breakdown: { addition: { correct: 1, total: 2 } } }];
    expect(computeInsights(sessions)).toEqual({ strongType: null, weakType: null });
  });

  it('picks the best and worst notion once at least 3 attempts are recorded', () => {
    const sessions = [
      { breakdown: { addition: { correct: 5, total: 5 }, soustraction: { correct: 1, total: 5 } } },
    ];
    const result = computeInsights(sessions);
    expect(result.strongType).toEqual({ type: 'addition', percent: 100 });
    expect(result.weakType).toEqual({ type: 'soustraction', percent: 20 });
  });

  it('reports only a weak point when the single eligible notion is below 75%', () => {
    const sessions = [{ breakdown: { addition: { correct: 1, total: 4 } } }];
    const result = computeInsights(sessions);
    expect(result.strongType).toBe(null);
    expect(result.weakType).toEqual({ type: 'addition', percent: 25 });
  });

  it('reports only a strong point when the single eligible notion is 75% or above', () => {
    const sessions = [{ breakdown: { addition: { correct: 3, total: 4 } } }];
    const result = computeInsights(sessions);
    expect(result.strongType).toEqual({ type: 'addition', percent: 75 });
    expect(result.weakType).toBe(null);
  });

  it('aggregates across multiple sessions before applying the threshold', () => {
    const sessions = [
      { breakdown: { addition: { correct: 1, total: 1 } } },
      { breakdown: { addition: { correct: 3, total: 3 } } },
    ];
    const result = computeInsights(sessions);
    expect(result.strongType.type).toBe('addition');
    expect(result.strongType.percent).toBe(100);
  });
});


describe('computeWeeklyWatch', () => {
  const referenceDate = new Date('2026-08-21T12:00:00Z');

  it('detects activity today', () => {
    const result = computeWeeklyWatch(
      [{ date: '2026-08-21', breakdown: {} }],
      {},
      { referenceDate }
    );

    expect(result.lastActivityLabel).toBe("Aujourd'hui");
    expect(result.daysSinceLastActivity).toBe(0);
  });

  it('returns the current weekly goal', () => {
    const result = computeWeeklyWatch(
      [],
      {
        weeklyGoalTarget: 5,
        weeklyGoalProgress: 3,
        weeklyGoalWeekStart: '2026-08-17',
      },
      { referenceDate }
    );

    expect(result.weeklyProgress).toBe(3);
    expect(result.weeklyTarget).toBe(5);
  });

  it('flags a weak notion below 50 percent', () => {
    const result = computeWeeklyWatch(
      [{
        date: '2026-08-21',
        breakdown: {
          monnaie: { correct: 2, total: 5 },
        },
      }],
      {},
      { referenceDate }
    );

    expect(result.weakType.type).toBe('monnaie');
    expect(result.weakType.percent).toBe(40);
    expect(result.status).toBe('attention');
  });

  it('returns the focus selected by the parent', () => {
    const result = computeWeeklyWatch(
      [{ date: '2026-08-21', breakdown: {} }],
      { focusType: 'division' },
      { referenceDate }
    );

    expect(result.focusType).toBe('division');
  });
});

describe('computeWeeklyWatch current week filtering', () => {
  it('uses only the current week to find the weak notion', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-10',
          breakdown: {
            monnaie: { correct: 0, total: 10 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            soustraction: { correct: 1, total: 5 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weakType).toEqual({
      type: 'soustraction',
      percent: 20,
    });
  });
});

describe('computeWeeklyWatch insufficient data', () => {
  it('reports insufficient data when the week has fewer than 3 attempts', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 1, total: 2 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weeklyAttempts).toBe(2);
    expect(result.hasEnoughWeeklyData).toBe(false);
    expect(result.status).toBe('insufficient');
    expect(result.statusLabel).toBe('Pas assez de donn\u00e9es');
  });

  it('uses a normal status once enough answers exist', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 3, total: 4 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weeklyAttempts).toBe(4);
    expect(result.hasEnoughWeeklyData).toBe(true);
    expect(result.status).not.toBe('insufficient');
  });
});

describe('computeWeeklyWatch weekly data threshold', () => {
  it('reports how many answers are still needed', () => {
    const result = computeWeeklyWatch(
      [{
        date: '2026-08-21',
        breakdown: {
          addition: { correct: 1, total: 1 },
        },
      }],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weeklyAttempts).toBe(1);
    expect(result.weeklyAttemptsNeeded).toBe(2);
  });

  it('reports zero answers needed once the threshold is reached', () => {
    const result = computeWeeklyWatch(
      [{
        date: '2026-08-21',
        breakdown: {
          addition: { correct: 3, total: 5 },
        },
      }],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weeklyAttempts).toBe(5);
    expect(result.weeklyAttemptsNeeded).toBe(0);
  });
});

describe('computeWeeklyWatch weekly trend', () => {
  it('reports an upward trend against the previous week', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-14',
          breakdown: {
            addition: { correct: 5, total: 10 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 8, total: 10 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.previousWeekPercent).toBe(50);
    expect(result.currentWeekPercent).toBe(80);
    expect(result.trendDelta).toBe(30);
    expect(result.trendDirection).toBe('up');
    expect(result.trendLabel).toBe('\u2197 +30 pts');
  });

  it('reports a downward trend against the previous week', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-14',
          breakdown: {
            addition: { correct: 9, total: 10 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 6, total: 10 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.previousWeekPercent).toBe(90);
    expect(result.currentWeekPercent).toBe(60);
    expect(result.trendDelta).toBe(-30);
    expect(result.trendDirection).toBe('down');
    expect(result.trendLabel).toBe('\u2198 -30 pts');
  });

  it('does not invent a trend without enough data in both weeks', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-14',
          breakdown: {
            addition: { correct: 1, total: 2 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 3, total: 4 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.previousWeekPercent).toBe(null);
    expect(result.currentWeekPercent).toBe(75);
    expect(result.trendDelta).toBe(null);
    expect(result.trendDirection).toBe('unknown');
    expect(result.trendLabel).toBe('Pas assez de recul');
  });
});

describe('computeWeeklyWatch parent recommendation', () => {
  it('recommends continuing when a weak notion is improving', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-14',
          breakdown: {
            monnaie: { correct: 1, total: 5 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            monnaie: { correct: 3, total: 5 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weakType.type).toBe('monnaie');
    expect(result.trendDirection).toBe('up');
    expect(result.recommendationTone).toBe('positive');
    expect(result.recommendationLabel).toContain('Progr\u00e8s en cours');
    expect(result.recommendationFocusType).toBe('monnaie');
  });

  it('recommends priority targeting when a weak notion is declining', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-14',
          breakdown: {
            soustraction: { correct: 4, total: 5 },
          },
        },
        {
          date: '2026-08-21',
          breakdown: {
            soustraction: { correct: 1, total: 5 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.weakType.type).toBe('soustraction');
    expect(result.trendDirection).toBe('down');
    expect(result.recommendationTone).toBe('attention');
    expect(result.recommendationLabel).toContain('priorit\u00e9');
  });

  it('does not overinterpret a week with insufficient data', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 1, total: 2 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.hasEnoughWeeklyData).toBe(false);
    expect(result.recommendationTone).toBe('neutral');
    expect(result.recommendationLabel).toContain('conclusion fiable');
    expect(result.recommendationFocusType).toBe(null);
  });

  it('does not offer the action when the weak notion is already targeted', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 1, total: 5 },
          },
        },
      ],
      { focusType: 'addition' },
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.hasEnoughWeeklyData).toBe(true);
    expect(result.weakType.type).toBe('addition');
    expect(result.recommendationFocusType).toBe(null);
  });

  it('does not offer the action when no weak notion is detected', () => {
    const result = computeWeeklyWatch(
      [
        {
          date: '2026-08-21',
          breakdown: {
            addition: { correct: 5, total: 5 },
          },
        },
      ],
      {},
      { referenceDate: new Date('2026-08-21T12:00:00Z') }
    );

    expect(result.hasEnoughWeeklyData).toBe(true);
    expect(result.weakType).toBe(null);
    expect(result.recommendationFocusType).toBe(null);
  });
});

describe('dailyActivityLast7Days', () => {
  const referenceDate = new Date('2026-08-11T00:00:00Z');

  it('returns 7 days ending on the reference date, oldest first', () => {
    const result = dailyActivityLast7Days([], { referenceDate });
    expect(result).toHaveLength(7);
    expect(result[0].dateKey).toBe('2026-08-05');
    expect(result[6].dateKey).toBe('2026-08-11');
  });

  it('sums correct answers and totals per day from sessions', () => {
    const sessions = [
      { date: '2026-08-11', correctCount: 9, questionsTotal: 10 },
      { date: '2026-08-11', correctCount: 3, questionsTotal: 5 },
      { date: '2026-08-10', correctCount: 4, questionsTotal: 4 },
    ];
    const result = dailyActivityLast7Days(sessions, { referenceDate });
    const today = result.find((d) => d.dateKey === '2026-08-11');
    const yesterday = result.find((d) => d.dateKey === '2026-08-10');
    expect(today).toMatchObject({ correctCount: 12, questionsTotal: 15 });
    expect(yesterday).toMatchObject({ correctCount: 4, questionsTotal: 4 });
  });

  it('ignores sessions outside the 7-day window', () => {
    const sessions = [{ date: '2026-07-01', correctCount: 5, questionsTotal: 5 }];
    const result = dailyActivityLast7Days(sessions, { referenceDate });
    result.forEach((d) => expect(d.questionsTotal).toBe(0));
  });
});

describe('dailyActivityChartSvg', () => {
  it('renders an svg with one label per day', () => {
    const days = dailyActivityLast7Days(
      [{ date: '2026-08-11', correctCount: 9, questionsTotal: 10 }],
      { referenceDate: new Date('2026-08-11T00:00:00Z') }
    );
    const svg = dailyActivityChartSvg(days);
    expect(svg).toContain('<svg');
    expect(svg).toContain('11/08');
    expect((svg.match(/<rect/g) ?? []).length).toBe(14);
  });

  it('does not throw when every day is empty', () => {
    const days = dailyActivityLast7Days([], { referenceDate: new Date('2026-08-11T00:00:00Z') });
    expect(() => dailyActivityChartSvg(days)).not.toThrow();
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
