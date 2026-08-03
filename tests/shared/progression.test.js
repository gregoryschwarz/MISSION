import { describe, it, expect } from 'vitest';
import {
  xpForSession,
  levelForXp,
  updateStreak,
  newlyEarnedBadges,
  newlyMasteredTypes,
  newlyEarnedPerfectBadges,
  applyProgression,
} from '../../src/shared/progression.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../../src/shared/difficulty.js';

describe('xpForSession', () => {
  it('awards 10 xp per correct answer', () => {
    expect(xpForSession(7)).toBe(70);
  });
});

describe('levelForXp', () => {
  it('starts at level 1 with 0 xp', () => {
    expect(levelForXp(0)).toBe(1);
  });
  it('levels up every 100 xp', () => {
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });
});

describe('updateStreak', () => {
  it('starts a streak at 1 for the first session', () => {
    expect(updateStreak(0, null, '2026-08-02')).toBe(1);
  });
  it('increments the streak for a consecutive day', () => {
    expect(updateStreak(3, '2026-08-01', '2026-08-02')).toBe(4);
  });
  it('resets the streak after a gap', () => {
    expect(updateStreak(5, '2026-07-20', '2026-08-02')).toBe(1);
  });
  it('keeps the streak unchanged for the same day', () => {
    expect(updateStreak(2, '2026-08-02', '2026-08-02')).toBe(2);
  });
});

describe('newlyEarnedBadges', () => {
  it('awards a badge once the streak threshold is reached', () => {
    expect(newlyEarnedBadges(3, [])).toEqual(['streak-3']);
  });
  it('does not re-award an existing badge', () => {
    expect(newlyEarnedBadges(3, ['streak-3'])).toEqual([]);
  });
});

describe('newlyMasteredTypes', () => {
  it('detects a type that just reached level 3', () => {
    const previous = { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['addition']);
  });

  it('does not re-trigger for a type already at level 3 before the mission', () => {
    const previous = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual([]);
  });

  it('detects multiple types mastered in the same mission', () => {
    const previous = { addition: 2, soustraction: 2, multiplication: 1, comparaison: 1 };
    const next = { addition: 3, soustraction: 3, multiplication: 1, comparaison: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['addition', 'soustraction']);
  });
});

describe('newlyEarnedPerfectBadges', () => {
  it('awards the first perfect-mission badge at count 1', () => {
    expect(newlyEarnedPerfectBadges(1, [])).toEqual(['perfect-1']);
  });

  it('does not re-award an existing perfect badge', () => {
    expect(newlyEarnedPerfectBadges(1, ['perfect-1'])).toEqual([]);
  });

  it('awards multiple thresholds at once if count jumps past several', () => {
    expect(newlyEarnedPerfectBadges(10, [])).toEqual(['perfect-1', 'perfect-10']);
  });
});

describe('applyProgression', () => {
  it('combines xp, level, streak and badges into a profile update', () => {
    const profile = { xp: 90, avatarLevel: 1, streakDays: 2, badges: [], lastSessionDate: '2026-08-01' };
    const summary = { date: '2026-08-02', correctCount: 3 };
    const result = applyProgression(profile, summary);
    expect(result.xp).toBe(120);
    expect(result.avatarLevel).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.streakDays).toBe(3);
    expect(result.newBadges).toEqual(['streak-3']);
    expect(result.badges).toEqual(['streak-3']);
  });

  it('awards a mastery badge when a type reaches level 3 this mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      perfectMissionsCount: 0,
    };
    const summary = { date: '2026-08-02', correctCount: 5, questionsTotal: 10 };
    const nextDifficultyLevels = { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 };
    const result = applyProgression(profile, summary, nextDifficultyLevels);
    expect(result.newBadges).toContain('mastery-addition');
    expect(result.badges).toContain('mastery-addition');
  });

  it('increments perfectMissionsCount and awards perfect-1 on a flawless mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
      perfectMissionsCount: 0,
    };
    const summary = { date: '2026-08-02', correctCount: 10, questionsTotal: 10 };
    const result = applyProgression(profile, summary, DEFAULT_DIFFICULTY_LEVELS);
    expect(result.perfectMissionsCount).toBe(1);
    expect(result.newBadges).toContain('perfect-1');
  });

  it('does not increment perfectMissionsCount on an imperfect mission', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 0,
      badges: [],
      lastSessionDate: null,
      difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
      perfectMissionsCount: 4,
    };
    const summary = { date: '2026-08-02', correctCount: 9, questionsTotal: 10 };
    const result = applyProgression(profile, summary, DEFAULT_DIFFICULTY_LEVELS);
    expect(result.perfectMissionsCount).toBe(4);
    expect(result.newBadges).not.toContain('perfect-1');
  });
});
