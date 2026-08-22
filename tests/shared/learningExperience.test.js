import { describe, expect, it } from 'vitest';
import {
  SCHOOL_LEVELS,
  difficultyForSchoolLevel,
  normalizeSchoolLevel,
  reviewQuestionsFromNotebook,
  storyChapter,
  storyProgressAfterMission,
  subjectMissionCountsAfter,
  subjectSummary,
  surpriseSubjectIds,
  updateMistakeNotebook,
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
    expect(reviewQuestionsFromNotebook(notebook, 1)[0]).toMatchObject({ type: 'anglais', answer: 'chat' });
    expect(reviewQuestionsFromNotebook(notebook, 1)[0].errorCount).toBeUndefined();
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
