import { describe, expect, it } from 'vitest';
import {
  SCHOOL_LEVELS,
  difficultyForSchoolLevel,
  normalizeSchoolLevel,
  reviewQuestionsFromNotebook,
  learningStatusForEntry,
  notionLearningStatuses,
  personalizedLearningPlan,
  retentionSummary,
  storyChapter,
  storyProgressAfterMission,
  subjectMissionCountsAfter,
  subjectSummary,
  surpriseSubjectIds,
  updateMistakeNotebook,
  updateLearningNotebook,
  weeklyLearningTheme,
} from '../../src/shared/learningExperience.js';

describe('school level', () => {
  it('supports every primary-school level from CP to CM2', () => {
    expect(SCHOOL_LEVELS.map((level) => level.id)).toEqual(['CP', 'CE1', 'CE2', 'CM1', 'CM2']);
    expect(normalizeSchoolLevel('CM1')).toBe('CM1');
    expect(normalizeSchoolLevel('inconnu')).toBe('CE2');
  });

  it('caps adaptive difficulty for younger children', () => {
    expect(difficultyForSchoolLevel(3, 'CP')).toBe(1);
    expect(difficultyForSchoolLevel(3, 'CE2')).toBe(2);
    expect(difficultyForSchoolLevel(3, 'CM2')).toBe(3);
  });
});

describe('mistake notebook', () => {
  const mistake = { type: 'anglais', prompt: 'Que veut dire cat ?', answer: 'chat', options: ['chat', 'chien', 'lapin'] };

  it('stores mistakes persistently and increments repeated errors', () => {
    const first = updateMistakeNotebook([], [mistake], '2026-08-22');
    const second = updateMistakeNotebook(first, [mistake], '2026-08-23');
    expect(second[0]).toMatchObject({ type: 'anglais', errorCount: 2, lastErrorDate: '2026-08-23' });
  });

  it('returns review questions in priority order without persistence metadata', () => {
    const notebook = updateMistakeNotebook([], [mistake, { ...mistake, type: 'sciences', prompt: 'Planète ?', answer: 'Terre' }], '2026-08-22');
    expect(reviewQuestionsFromNotebook(notebook, 1, '2026-08-23')[0]).toMatchObject({ type: 'anglais', answer: 'chat' });
    expect(reviewQuestionsFromNotebook(notebook, 1, '2026-08-23')[0].errorCount).toBeUndefined();
  });

  it('schedules an error for the next day, then spaces successful reviews', () => {
    const failed = updateLearningNotebook([], [{ ...mistake, isCorrect: false }], '2026-08-22');
    expect(failed[0]).toMatchObject({ nextReviewDate: '2026-08-23', retentionStage: 0, lastResult: 'incorrect' });
    const reviewed = updateLearningNotebook(failed, [{ ...mistake, isCorrect: true }], '2026-08-23');
    expect(reviewed[0]).toMatchObject({ nextReviewDate: '2026-08-26', retentionStage: 1, lastResult: 'correct' });
    const retained = updateLearningNotebook(reviewed, [{ ...mistake, isCorrect: true }], '2026-08-26');
    expect(retained[0]).toMatchObject({ nextReviewDate: '2026-09-02', retentionStage: 2 });
    expect(learningStatusForEntry(retained[0]).id).toBe('acquis');
  });

  it('never validates two consolidation stages on the same day', () => {
    const failed = updateLearningNotebook([], [{ ...mistake, isCorrect: false }], '2026-08-22');
    const firstSuccess = updateLearningNotebook(failed, [{ ...mistake, isCorrect: true }], '2026-08-22');
    const repeatedSameDay = updateLearningNotebook(firstSuccess, [{ ...mistake, isCorrect: true }], '2026-08-22');
    expect(firstSuccess[0].retentionStage).toBe(1);
    expect(repeatedSameDay[0].retentionStage).toBe(1);
    expect(learningStatusForEntry(repeatedSameDay[0]).id).toBe('en-progres');
  });

  it('selects only due reviews and prioritizes repeated errors', () => {
    const notebook = [
      { ...mistake, errorCount: 1, nextReviewDate: '2026-08-24' },
      { ...mistake, type: 'sciences', prompt: 'Planète ?', errorCount: 3, nextReviewDate: '2026-08-22' },
    ];
    expect(reviewQuestionsFromNotebook(notebook, 10, '2026-08-22').map((question) => question.type)).toEqual(['sciences']);
    expect(personalizedLearningPlan(notebook, 10, '2026-08-22')).toMatchObject({
      reviewQuestions: [expect.objectContaining({ type: 'sciences' })],
      priorityTypes: ['sciences', 'anglais'],
    });
  });
});

describe('learning retention', () => {
  const sessions = [
    { date: '2026-08-21', missionKind: 'standard', breakdown: { addition: { correct: 4, total: 5 }, soustraction: { correct: 1, total: 5 } } },
    { date: '2026-08-22', missionKind: 'mistake-review', correctCount: 4, questionsTotal: 5, breakdown: { addition: { correct: 4, total: 5 } } },
    { date: '2026-08-22', missionKind: 'personalized', correctCount: 3, questionsTotal: 5, breakdown: { soustraction: { correct: 3, total: 5 } } },
  ];

  it('labels every attempted notion as acquired, progressing or needing review', () => {
    expect(notionLearningStatuses(sessions)).toEqual([
      expect.objectContaining({ type: 'addition', status: 'acquis', percent: 80 }),
      expect.objectContaining({ type: 'soustraction', status: 'a-revoir', percent: 40 }),
    ]);
  });

  it('requires successful attempts on two different days before showing acquired', () => {
    const sameDay = [
      { date: '2026-08-22', breakdown: { addition: { correct: 5, total: 5 } } },
      { date: '2026-08-22', breakdown: { addition: { correct: 5, total: 5 } } },
    ];
    expect(notionLearningStatuses(sameDay)[0]).toMatchObject({ status: 'en-progres', successfulDayCount: 1 });
  });

  it('summarizes what was reviewed and retained for the parent', () => {
    const notebook = [
      { type: 'addition', prompt: '1+1', retentionStage: 2, nextReviewDate: '2026-08-30' },
      { type: 'soustraction', prompt: '3-1', retentionStage: 0, nextReviewDate: '2026-08-22' },
    ];
    expect(retentionSummary(sessions, notebook, '2026-08-22')).toEqual({
      reviewMissions: 2,
      reviewedQuestions: 10,
      correctReviews: 7,
      reviewPercent: 70,
      retainedCount: 1,
      progressingCount: 0,
      dueCount: 1,
    });
  });
});

describe('weekly themes, surprise and story', () => {
  it('returns a stable learning theme for every date within one week', () => {
    expect(weeklyLearningTheme('2026-08-17')).toEqual(weeklyLearningTheme('2026-08-23'));
    expect(weeklyLearningTheme('2026-08-17')).toMatchObject({ id: expect.any(String), subjectIds: expect.any(Array) });
  });

  it('chooses up to three distinct enabled subjects for a surprise', () => {
    expect(surpriseSubjectIds(['anglais', 'sciences', 'arts', 'logique'], 3, () => 0.5)).toHaveLength(3);
    expect(new Set(surpriseSubjectIds(['anglais', 'sciences', 'arts'], 3, () => 0.5)).size).toBe(3);
  });

  it('advances the story once per completed mission and changes chapter', () => {
    expect(storyProgressAfterMission({ storyProgress: 4 })).toBe(5);
    expect(storyChapter(0).id).not.toBe(storyChapter(5).id);
  });
});

describe('subject progress', () => {
  it('increments only the completed subject mission', () => {
    expect(subjectMissionCountsAfter({ anglais: 2 }, 'anglais')).toMatchObject({ anglais: 3 });
    expect(subjectMissionCountsAfter({ anglais: 2 }, 'surprise')).toEqual({ anglais: 2 });
  });

  it('summarizes missions, success and time for the parent dashboard', () => {
    const sessions = [
      { subject: 'anglais', correctCount: 8, questionsTotal: 10, durationSeconds: 120 },
      { subject: 'anglais', correctCount: 6, questionsTotal: 10, durationSeconds: 180 },
    ];
    expect(subjectSummary(sessions, 'anglais')).toEqual({ missions: 2, correct: 14, total: 20, percent: 70, durationMinutes: 5 });
  });
});
