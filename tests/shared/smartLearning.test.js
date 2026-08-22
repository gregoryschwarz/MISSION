import { describe, expect, it } from 'vitest';
import {
  adaptiveMissionPlan,
  companionMood,
  correctionCoach,
  offlineSyncState,
  normalizeAccessibilityPreferences,
  normalizeFamilyLearningPlan,
  seasonalEventState,
  spacedReviewDates,
  toggleWishlistItem,
  weeklyParentReport,
} from '../../src/shared/smartLearning.js';

describe('smart learning experience', () => {
  it('targets the weakest notion and lowers difficulty after repeated errors', () => {
    expect(adaptiveMissionPlan({
      difficultyLevels: { addition: 3, soustraction: 2 },
      learningStats: {
        addition: { correct: 9, total: 10 },
        soustraction: { correct: 2, total: 8 },
      },
      mistakeNotebook: [{ type: 'soustraction', errorCount: 4 }],
    })).toMatchObject({ targetType: 'soustraction', difficulty: 1, reviewShare: 0.4 });
  });

  it('plans reviews after 1, 3, 7 and 14 days', () => {
    expect(spacedReviewDates('2026-08-22')).toEqual([
      '2026-08-23', '2026-08-25', '2026-08-29', '2026-09-05',
    ]);
  });

  it('builds a guided correction and a similar retry without revealing it first', () => {
    const coach = correctionCoach({ type: 'addition', a: 27, b: 15, answer: 42, prompt: '27 + 15 ?' }, 32);
    expect(coach.title).toContain('Reprenons');
    expect(coach.steps).toHaveLength(3);
    expect(coach.retry).toMatchObject({ type: 'addition', a: 28, b: 15, answer: 43 });
  });

  it('normalizes parent planning, duration and active school days', () => {
    expect(normalizeFamilyLearningPlan({
      dailyMinutes: 99,
      schoolDays: ['lundi', 'mercredi', 'lundi', 'invalid'],
      preferredSubjects: ['anglais', 'sciences'],
    })).toEqual({
      dailyMinutes: 45,
      schoolDays: ['lundi', 'mercredi'],
      preferredSubjects: ['anglais', 'sciences'],
    });
  });

  it('adds and removes a shop item from the wish list', () => {
    expect(toggleWishlistItem(['space-pack'], 'magic-pack')).toEqual(['space-pack', 'magic-pack']);
    expect(toggleWishlistItem(['space-pack', 'magic-pack'], 'space-pack')).toEqual(['magic-pack']);
  });

  it('creates a seasonal challenge with progress and a matching animation', () => {
    expect(seasonalEventState({ seasonalMissionCounts: { winter: 3 } }, new Date(2026, 0, 10))).toMatchObject({
      id: 'winter', emoji: '❄️', progress: 3, target: 8, effect: 'snow', completed: false,
    });
  });

  it('gives the companion an encouraging mood based on today progress', () => {
    expect(companionMood({ dailyMissionCount: 0, streakDays: 4 }, '2026-08-22')).toMatchObject({ id: 'ready' });
    expect(companionMood({ dailyMissionCount: 3, dailyMissionCountDate: '2026-08-22' }, '2026-08-22')).toMatchObject({ id: 'proud' });
  });

  it('creates a plain-language weekly parent report', () => {
    const report = weeklyParentReport([
      { date: '2026-08-18', correctCount: 8, questionsTotal: 10, durationSeconds: 300, breakdown: { addition: { correct: 8, total: 10 } } },
      { date: '2026-08-20', correctCount: 4, questionsTotal: 10, durationSeconds: 420, breakdown: { soustraction: { correct: 4, total: 10 } } },
    ], {}, new Date('2026-08-22T12:00:00Z'));
    expect(report).toMatchObject({ missions: 2, correct: 12, total: 20, percent: 60, minutes: 12, priorityType: 'soustraction' });
  });

  it('reports offline queue status without losing pending missions', () => {
    expect(offlineSyncState(3, false)).toEqual({ id: 'offline', pending: 3, label: 'Hors connexion · 3 missions à synchroniser' });
    expect(offlineSyncState(0, true)).toEqual({ id: 'synced', pending: 0, label: 'Tout est synchronisé' });
  });

  it('normalizes readable and motion-safe accessibility preferences', () => {
    expect(normalizeAccessibilityPreferences({ textSize: 'large', dyslexiaMode: true, reducedMotion: true, readInstructions: true })).toEqual({
      textSize: 'large', dyslexiaMode: true, reducedMotion: true, readInstructions: true,
    });
    expect(normalizeAccessibilityPreferences({ textSize: 'giant' }).textSize).toBe('normal');
  });
});
