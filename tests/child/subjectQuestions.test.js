import { describe, expect, it } from 'vitest';
import {
  SUBJECT_QUESTION_BANKS,
  generateSubjectMission,
  generateSubjectQuestion,
  generateSurpriseMission,
} from '../../src/child/subjectQuestions.js';
import { SUBJECTS } from '../../src/shared/subjects.js';

describe('subject question banks', () => {
  it('provides content at all three difficulty levels for every subject', () => {
    SUBJECTS.forEach(({ id }) => {
      expect(Object.keys(SUBJECT_QUESTION_BANKS[id])).toEqual(['1', '2', '3']);
      Object.values(SUBJECT_QUESTION_BANKS[id]).forEach((questions) => expect(questions.length).toBeGreaterThanOrEqual(20));
    });
  });

  it('generates a valid accessible QCM for every subject', () => {
    SUBJECTS.forEach(({ id }) => {
      const question = generateSubjectQuestion(id, 2);
      expect(question).toMatchObject({ type: id });
      expect(question.prompt).toBeTruthy();
      expect(['qcm', 'vrai-faux', 'image', 'association', 'saisie', 'chronologie', 'classement']).toContain(question.format);
      if (question.format === 'saisie') {
        expect(question.options).toBeUndefined();
      } else {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.options).toContain(question.answer);
      }
    });
  });

  it('rejects an unknown subject instead of silently generating bad data', () => {
    expect(() => generateSubjectQuestion('inconnue')).toThrow('Matière inconnue');
  });

  it('contains the manually curated human-body pack at every school stage', () => {
    expect(new Set(SUBJECT_QUESTION_BANKS.sciences[1].map((question) => question.sourceId)).size).toBeGreaterThanOrEqual(25);
    expect(new Set(SUBJECT_QUESTION_BANKS.sciences[2].map((question) => question.sourceId)).size).toBeGreaterThanOrEqual(19);
    expect(new Set(SUBJECT_QUESTION_BANKS.sciences[3].map((question) => question.sourceId)).size).toBeGreaterThanOrEqual(19);
  });

  it('offers at least fifteen genuinely different facts per level in every subject', () => {
    SUBJECTS.forEach(({ id }) => {
      Object.values(SUBJECT_QUESTION_BANKS[id]).forEach((questions) => {
        expect(new Set(questions.map((question) => question.sourceId)).size).toBeGreaterThanOrEqual(15);
      });
    });
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

  it('does not repeat an exercise inside one ten-question mission', () => {
    const mission = generateSubjectMission('sciences', 10, { sciences: 3 }, { schoolLevel: 'CM2' });
    expect(new Set(mission.map((question) => question.prompt)).size).toBe(10);
  });

  it('does not disguise the same learning fact as several formats in one mission', () => {
    SUBJECTS.forEach(({ id }) => {
      const mission = generateSubjectMission(id, 10, { [id]: 1 }, { schoolLevel: 'CP' });
      expect(new Set(mission.map((question) => question.sourceId)).size).toBe(10);
    });
  });

  it('honours the school-level difficulty cap', () => {
    const mission = generateSubjectMission('sciences', 10, { sciences: 3 }, { schoolLevel: 'CP' });
    expect(mission.every((question) => question.level === 1)).toBe(true);
  });

  it('builds a mixed surprise mission from several enabled subjects', () => {
    const mission = generateSurpriseMission(['anglais', 'sciences', 'arts'], 10, {}, { schoolLevel: 'CE2' });
    expect(mission).toHaveLength(10);
    expect(new Set(mission.map((question) => question.type)).size).toBeGreaterThanOrEqual(2);
  });
});

describe('exercise formats', () => {
  it('covers all seven visible formats across the catalogue', () => {
    const formats = new Set(Object.values(SUBJECT_QUESTION_BANKS).flatMap((levels) => Object.values(levels).flatMap((questions) => questions.map((question) => question.format))));
    expect(formats).toEqual(new Set(['qcm', 'vrai-faux', 'image', 'association', 'saisie', 'chronologie', 'classement']));
  });
});
