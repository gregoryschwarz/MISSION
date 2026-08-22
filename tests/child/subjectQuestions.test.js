import { describe, expect, it } from 'vitest';
import {
  SUBJECT_QUESTION_BANKS,
  generateSubjectMission,
  generateSubjectQuestion,
} from '../../src/child/subjectQuestions.js';
import { SUBJECTS } from '../../src/shared/subjects.js';

describe('subject question banks', () => {
  it('provides content at all three difficulty levels for every subject', () => {
    SUBJECTS.forEach(({ id }) => {
      expect(Object.keys(SUBJECT_QUESTION_BANKS[id])).toEqual(['1', '2', '3']);
      Object.values(SUBJECT_QUESTION_BANKS[id]).forEach((questions) => expect(questions.length).toBeGreaterThanOrEqual(4));
    });
  });

  it('generates a valid accessible QCM for every subject', () => {
    SUBJECTS.forEach(({ id }) => {
      const question = generateSubjectQuestion(id, 2);
      expect(question).toMatchObject({ type: id });
      expect(question.prompt).toBeTruthy();
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options).size).toBe(3);
      expect(question.options).toContain(question.answer);
    });
  });

  it('rejects an unknown subject instead of silently generating bad data', () => {
    expect(() => generateSubjectQuestion('inconnue')).toThrow('Matière inconnue');
  });
});

describe('generateSubjectMission', () => {
  it('returns the requested number of questions from one subject', () => {
    const mission = generateSubjectMission('sciences', 10, { sciences: 3 });
    expect(mission).toHaveLength(10);
    expect(mission.every((question) => question.type === 'sciences')).toBe(true);
  });

  it('uses level one when no difficulty has been recorded yet', () => {
    const levelOnePrompts = new Set(SUBJECT_QUESTION_BANKS.anglais[1].map((question) => question.prompt));
    const mission = generateSubjectMission('anglais', 12, {});
    expect(mission.every((question) => levelOnePrompts.has(question.prompt))).toBe(true);
  });
});
