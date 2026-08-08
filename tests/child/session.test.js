import { describe, it, expect, vi } from 'vitest';
import {
  createSession,
  currentQuestion,
  submitAnswer,
  recordAnswer,
  isSessionComplete,
  finishSession,
} from '../../src/child/session.js';

const sampleQuestions = [
  { type: 'addition', a: 2, b: 3, answer: 5, prompt: '2 + 3' },
  { type: 'multiplication', a: 3, b: 4, answer: 12, prompt: '3 x 4' },
];

describe('session flow', () => {
  it('tracks correct and incorrect answers per type', () => {
    const session = createSession(sampleQuestions);
    expect(currentQuestion(session).prompt).toBe('2 + 3');

    expect(submitAnswer(session, 5)).toBe(true);
    expect(submitAnswer(session, 99)).toBe(false);

    expect(session.correctCount).toBe(1);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 1 });
    expect(session.breakdown.multiplication).toEqual({ correct: 0, total: 1 });
    expect(isSessionComplete(session)).toBe(true);
  });

  it('returns false initially, before any answers', () => {
    const session = createSession(sampleQuestions);
    expect(isSessionComplete(session)).toBe(false);
  });

  it('throws when submitting an answer after the session is already complete', () => {
    const session = createSession(sampleQuestions);
    submitAnswer(session, 5);
    submitAnswer(session, 12);
    expect(() => submitAnswer(session, 5)).toThrow();
  });

  it('produces a summary with duration and breakdown', () => {
    vi.useFakeTimers();
    const session = createSession(sampleQuestions);
    vi.advanceTimersByTime(5000);
    submitAnswer(session, 5);
    submitAnswer(session, 12);
    const summary = finishSession(session);
    expect(summary.questionsTotal).toBe(2);
    expect(summary.correctCount).toBe(2);
    expect(summary.durationSeconds).toBe(5);
    expect(summary.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.useRealTimers();
  });

  it('initializes breakdown entries for division, fraction, and geometrie', () => {
    const session = createSession([]);
    expect(session.breakdown.division).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.fraction).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.geometrie).toEqual({ correct: 0, total: 0 });
  });

  it('initializes breakdown entries for monnaie, longueur, and temps', () => {
    const session = createSession([]);
    expect(session.breakdown.monnaie).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.longueur).toEqual({ correct: 0, total: 0 });
    expect(session.breakdown.temps).toEqual({ correct: 0, total: 0 });
  });

  it('initializes a breakdown entry for probleme', () => {
    const session = createSession([]);
    expect(session.breakdown.probleme).toEqual({ correct: 0, total: 0 });
  });

  it('initializes a breakdown entry for accord-pluriel', () => {
    const session = createSession([]);
    expect(session.breakdown['accord-pluriel']).toEqual({ correct: 0, total: 0 });
  });
});

describe('recordAnswer', () => {
  it('updates breakdown and correctCount for a correct answer, without touching the index', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'addition' }, true);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 1 });
    expect(session.correctCount).toBe(1);
    expect(session.index).toBe(0);
  });

  it('updates breakdown without incrementing correctCount for an incorrect answer', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'multiplication' }, false);
    expect(session.breakdown.multiplication).toEqual({ correct: 0, total: 1 });
    expect(session.correctCount).toBe(0);
  });

  it('accumulates across multiple calls for the same type', () => {
    const session = createSession(sampleQuestions);
    recordAnswer(session, { type: 'addition' }, true);
    recordAnswer(session, { type: 'addition' }, false);
    expect(session.breakdown.addition).toEqual({ correct: 1, total: 2 });
  });
});
