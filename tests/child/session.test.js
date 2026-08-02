import { describe, it, expect, vi } from 'vitest';
import {
  createSession,
  currentQuestion,
  submitAnswer,
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
});
