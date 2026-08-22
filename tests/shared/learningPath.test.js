import { describe, expect, it } from 'vitest';
import {
  diagnosticPlanForSchoolLevel,
  learningLessonForType,
  learningPathSummary,
  progressiveQuestionLevels,
  weakestLearningType,
} from '../../src/shared/learningPath.js';

describe('guided learning path', () => {
  it('creates a concise lesson with a rule and worked example', () => {
    const lesson = learningLessonForType('addition', { type: 'addition', a: 27, b: 15, answer: 42 });
    expect(lesson).toMatchObject({ type: 'addition', title: expect.stringContaining('Addition') });
    expect(lesson.rule.length).toBeGreaterThan(30);
    expect(lesson.exampleSteps.at(-1)).toContain('27 + 15 = 42');
  });

  it('builds easy, guided and independent levels without exceeding school level', () => {
    expect(progressiveQuestionLevels(3, 'CP')).toEqual([1, 1, 1]);
    expect(progressiveQuestionLevels(2, 'CE2')).toEqual([1, 2, 2]);
    expect(progressiveQuestionLevels(3, 'CM2')).toEqual([1, 2, 3]);
  });

  it('selects the most repeated mistake before using cumulative scores', () => {
    expect(weakestLearningType({
      mistakeNotebook: [{ type: 'addition', errorCount: 1 }, { type: 'soustraction', errorCount: 4 }],
      learningStats: { division: { correct: 0, total: 10 } },
    })).toBe('soustraction');
    expect(weakestLearningType({ learningStats: { addition: { correct: 8, total: 10 }, division: { correct: 2, total: 10 } } })).toBe('division');
  });
});

describe('school diagnostic', () => {
  it('creates ten balanced questions capped for CP, CE2 and CM2', () => {
    const cp = diagnosticPlanForSchoolLevel('CP');
    const ce2 = diagnosticPlanForSchoolLevel('CE2');
    const cm2 = diagnosticPlanForSchoolLevel('CM2');
    expect(cp).toHaveLength(10);
    expect(new Set(cp.map((item) => item.type)).size).toBeGreaterThanOrEqual(6);
    expect(cp.every((item) => item.level === 1)).toBe(true);
    expect(Math.max(...ce2.map((item) => item.level))).toBe(2);
    expect(Math.max(...cm2.map((item) => item.level))).toBe(3);
  });
});

describe('parent learning summary', () => {
  it('reports lessons, diagnostic and fragile or retained notions', () => {
    const profile = {
      diagnosticCompletedForLevel: 'CE2',
      diagnosticPercent: 70,
      mistakeNotebook: [
        { retentionStage: 2, nextReviewDate: '2026-09-01' },
        { retentionStage: 0, nextReviewDate: '2026-08-22' },
      ],
    };
    const sessions = [{ missionKind: 'learning' }, { missionKind: 'learning' }, { missionKind: 'diagnostic' }];
    expect(learningPathSummary(profile, sessions, '2026-08-22')).toEqual({
      lessonMissions: 2,
      diagnosticCompletedForLevel: 'CE2',
      diagnosticPercent: 70,
      retainedCount: 1,
      progressingCount: 0,
      fragileCount: 1,
      dueCount: 1,
    });
  });
});
