import { describe, expect, it } from 'vitest';
import {
  diagnosticPlanForSchoolLevel,
  adaptiveHintForQuestion,
  dueLearningRecap,
  learnedLessonsAfterLesson,
  learningLessonForType,
  learningPathSummary,
  scheduleLearningRecap,
  progressiveQuestionLevels,
  weakestLearningType,
} from '../../src/shared/learningPath.js';

describe('guided learning path', () => {
  it('creates a concise lesson with a rule and worked example', () => {
    const lesson = learningLessonForType('addition', { type: 'addition', a: 27, b: 15, answer: 42 }, 'CE2');
    expect(lesson).toMatchObject({ type: 'addition', title: expect.stringContaining('Addition') });
    expect(lesson.rule.length).toBeGreaterThan(30);
    expect(lesson.exampleSteps.at(-1)).toContain('27 + 15 = 42');
    expect(lesson).toMatchObject({ schoolLevel: 'CE2', commonMistake: expect.any(String), visualModel: expect.objectContaining({ kind: 'number-line' }) });
  });

  it('adapts the rule and example variant to the school level', () => {
    const question = { type: 'addition', a: 27, b: 15, answer: 42 };
    const cp = learningLessonForType('addition', question, 'CP', 0);
    const cm2 = learningLessonForType('addition', question, 'CM2', 1);
    expect(cp.rule).not.toBe(cm2.rule);
    expect(cp.exampleVariant).toBe(0);
    expect(cm2.exampleVariant).toBe(1);
    expect(cp.exampleSteps).not.toEqual(cm2.exampleSteps);
  });

  it('provides question-specific hints instead of repeating the generic rule', () => {
    expect(adaptiveHintForQuestion({ type: 'addition', a: 27, b: 15, answer: 42 })).toContain('27');
    expect(adaptiveHintForQuestion({ type: 'monnaie', answer: 750 })).toContain('centimes');
    expect(adaptiveHintForQuestion({ type: 'anglais', prompt: 'Que veut dire cat ?', answer: 'chat' })).toContain('mot important');
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

describe('lesson recap and parent history', () => {
  const lesson = learningLessonForType('addition', { type: 'addition', a: 8, b: 5, answer: 13 }, 'CE1');

  it('schedules a recap for the following day and only returns it when due', () => {
    const recaps = scheduleLearningRecap([], lesson, '2026-08-22');
    expect(recaps[0]).toMatchObject({ type: 'addition', dueDate: '2026-08-23', rule: lesson.rule });
    expect(dueLearningRecap(recaps, '2026-08-22')).toBe(null);
    expect(dueLearningRecap(recaps, '2026-08-23')).toMatchObject({ type: 'addition' });
  });

  it('keeps the latest rule and difficulty for the parent without duplicating a notion', () => {
    const first = learnedLessonsAfterLesson([], lesson, '2026-08-22', 2);
    const second = learnedLessonsAfterLesson(first, { ...lesson, rule: 'Règle actualisée' }, '2026-08-23', 1);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ type: 'addition', rule: 'Règle actualisée', lessonCount: 2, lastIncorrectCount: 1 });
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
