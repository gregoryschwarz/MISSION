import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ENABLED_SUBJECT_IDS,
  SUBJECTS,
  normalizeEnabledSubjects,
  subjectForId,
} from '../../src/shared/subjects.js';

describe('SUBJECTS', () => {
  it('registers the seven optional subjects in the intended order', () => {
    expect(SUBJECTS.map((subject) => subject.id)).toEqual([
      'anglais',
      'culture-generale',
      'sciences',
      'histoire-geographie',
      'logique',
      'orthographe',
      'arts',
    ]);
    expect(DEFAULT_ENABLED_SUBJECT_IDS).toEqual(SUBJECTS.map((subject) => subject.id));
  });

  it('provides child-friendly labels and visuals for every subject', () => {
    SUBJECTS.forEach((subject) => {
      expect(subject.label.length).toBeGreaterThan(2);
      expect(subject.emoji).toBeTruthy();
      expect(subject.description.length).toBeGreaterThan(10);
    });
    expect(subjectForId('anglais')).toMatchObject({ label: 'Anglais', emoji: '🇬🇧' });
  });
});

describe('normalizeEnabledSubjects', () => {
  it('enables every subject for legacy profiles without a setting', () => {
    expect(normalizeEnabledSubjects()).toEqual(DEFAULT_ENABLED_SUBJECT_IDS);
  });

  it('removes unknown and duplicate ids while preserving catalogue order', () => {
    expect(normalizeEnabledSubjects(['arts', 'unknown', 'anglais', 'arts'])).toEqual(['anglais', 'arts']);
  });

  it('allows a parent to disable every optional subject', () => {
    expect(normalizeEnabledSubjects([])).toEqual([]);
  });
});
