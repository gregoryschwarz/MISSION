import { describe, expect, it } from 'vitest';
import {
  PRIMARY_LEVELS,
  certificateForChapter,
  chapterValidation,
  competenciesForLevel,
  competencyProgressAfterMission,
  competencyStatus,
  homeworkQuestionPlan,
  nextLearningQuest,
  normalizeHomeworkAssignment,
  parentCompetencyOverview,
  vacationReviewPlan,
} from '../../src/shared/curriculum.js';

describe('primary-school competency curriculum', () => {
  it('covers CP to CM2 with several subjects and chapters at every level', () => {
    expect(PRIMARY_LEVELS).toEqual(['CP', 'CE1', 'CE2', 'CM1', 'CM2']);
    PRIMARY_LEVELS.forEach((level) => {
      const competencies = competenciesForLevel(level);
      expect(competencies.length).toBeGreaterThanOrEqual(12);
      expect(new Set(competencies.map((item) => item.subject)).size).toBeGreaterThanOrEqual(4);
      expect(competencies.every((item) => item.id && item.chapterId && item.questionType)).toBe(true);
    });
  });

  it('labels a competency as discovery, practice or mastered', () => {
    expect(competencyStatus({ total: 0 })).toBe('discovery');
    expect(competencyStatus({ correct: 5, total: 8, successfulDays: ['2026-08-20'] })).toBe('practice');
    expect(competencyStatus({ correct: 9, total: 10, successfulDays: ['2026-08-20', '2026-08-22'], validated: true })).toBe('mastered');
  });

  it('updates only the competency linked to a completed mission', () => {
    const next = competencyProgressAfterMission({}, {
      competencyId: 'CE2-maths-calcul-addition', date: '2026-08-22', correctCount: 8, questionsTotal: 10,
    });
    expect(next['CE2-maths-calcul-addition']).toMatchObject({ correct: 8, total: 10, attempts: 1, successfulDays: ['2026-08-22'] });
  });

  it('validates a chapter only after a successful chapter quiz', () => {
    expect(chapterValidation('calcul', { correctCount: 7, questionsTotal: 10 })).toMatchObject({ passed: false, percent: 70 });
    expect(chapterValidation('calcul', { correctCount: 8, questionsTotal: 10 })).toMatchObject({ passed: true, percent: 80, certificateUnlocked: true });
  });

  it('selects the next quest from the weakest unmastered competency', () => {
    const competencies = competenciesForLevel('CE2');
    const target = competencies[1];
    const quest = nextLearningQuest('CE2', { [competencies[0].id]: { correct: 9, total: 10, validated: true, successfulDays: ['a', 'b'] } });
    expect(quest).toMatchObject({ competencyId: target.id, chapterId: target.chapterId, title: expect.any(String), story: expect.any(String) });
  });

  it('creates an illustrated certificate for a validated chapter', () => {
    expect(certificateForChapter('CE2', 'calcul', 'Ambre', '2026-08-22')).toMatchObject({
      id: 'CE2-calcul', childName: 'Ambre', level: 'CE2', emoji: '🏆', date: '2026-08-22',
    });
  });

  it('summarizes mastered, practising and next competencies for the parent', () => {
    const competencies = competenciesForLevel('CE2');
    const overview = parentCompetencyOverview('CE2', {
      [competencies[0].id]: { correct: 9, total: 10, validated: true, successfulDays: ['a', 'b'] },
      [competencies[1].id]: { correct: 4, total: 7, successfulDays: ['a'] },
    });
    expect(overview).toMatchObject({ total: competencies.length, mastered: 1, practising: 1, discovery: competencies.length - 2 });
    expect(overview.nextCompetency.id).toBe(competencies[2].id);
  });

  it('normalizes a precise parent homework assignment', () => {
    expect(normalizeHomeworkAssignment({ competencyIds: ['a', 'a', 'b'], questionCount: 99, dueDate: '2026-08-30' })).toEqual({
      competencyIds: ['a', 'b'], questionCount: 20, dueDate: '2026-08-30', active: true, completedDate: null,
    });
  });

  it('distributes homework questions across selected competencies', () => {
    expect(homeworkQuestionPlan({ competencyIds: ['a', 'b', 'c'], questionCount: 8 })).toEqual([
      { competencyId: 'a', count: 3 }, { competencyId: 'b', count: 3 }, { competencyId: 'c', count: 2 },
    ]);
  });

  it('builds a vacation review from fragile and unmastered competencies', () => {
    const competencies = competenciesForLevel('CM1');
    const plan = vacationReviewPlan('CM1', {
      [competencies[0].id]: { correct: 2, total: 8 },
      [competencies[1].id]: { correct: 9, total: 10, validated: true, successfulDays: ['a', 'b'] },
    }, new Date(2026, 6, 15));
    expect(plan).toMatchObject({ active: true, season: 'été', title: 'Révisions de vacances' });
    expect(plan.competencyIds[0]).toBe(competencies[0].id);
    expect(plan.competencyIds).not.toContain(competencies[1].id);
  });
});
