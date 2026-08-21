import { describe, it, expect } from 'vitest';
import {
  xpForSession,
  levelForXp,
  xpProgressForLevel,
  coinsForSession,
  coinRewardBreakdown,
  spendCoins,
  refundCoins,
  updateStreak,
  streakStatus,
  applyDailyChallenge,
  weekStartKey,
  applyWeeklyGoal,
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

describe('xpProgressForLevel', () => {
  it('returns progress within the current 100xp level', () => {
    expect(xpProgressForLevel(0)).toEqual({ current: 0, target: 100 });
    expect(xpProgressForLevel(40)).toEqual({ current: 40, target: 100 });
    expect(xpProgressForLevel(140)).toEqual({ current: 40, target: 100 });
  });
});

describe('coinsForSession', () => {
  it('awards 1 coin per correct answer', () => {
    expect(coinsForSession(6, false)).toBe(6);
  });
  it('adds a bonus of 5 coins for a perfect mission', () => {
    expect(coinsForSession(10, true)).toBe(15);
  });
});

describe('coinRewardBreakdown', () => {
  it('explains answer, perfect and daily challenge coins separately', () => {
    expect(coinRewardBreakdown(10, true, true)).toEqual({
      answerCoins: 10,
      perfectBonus: 5,
      dailyBonus: 10,
      total: 25,
    });
  });

  it('does not invent bonuses for an ordinary mission', () => {
    expect(coinRewardBreakdown(7, false, false)).toEqual({
      answerCoins: 7,
      perfectBonus: 0,
      dailyBonus: 0,
      total: 7,
    });
  });
});

describe('spendCoins', () => {
  it('deducts coins when the balance is sufficient', () => {
    expect(spendCoins(10, 5)).toBe(5);
  });
  it('returns null when the balance is insufficient', () => {
    expect(spendCoins(3, 5)).toBeNull();
  });
  it('returns null for a negative amount', () => {
    expect(spendCoins(10, -1)).toBeNull();
  });
  it('allows spending the exact balance down to zero', () => {
    expect(spendCoins(5, 5)).toBe(0);
  });
});

describe('refundCoins', () => {
  it('credits back coins to the balance', () => {
    expect(refundCoins(5, 8)).toBe(13);
  });
  it('ignores a negative amount', () => {
    expect(refundCoins(5, -1)).toBe(5);
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

describe('streakStatus', () => {
  it('returns "none" when the child never played', () => {
    expect(streakStatus(null, '2026-08-02')).toBe('none');
  });
  it('returns "played-today" for the same day', () => {
    expect(streakStatus('2026-08-02', '2026-08-02')).toBe('played-today');
  });
  it('returns "at-risk" the day after the last session', () => {
    expect(streakStatus('2026-08-01', '2026-08-02')).toBe('at-risk');
  });
  it('returns "broken" after a gap of more than one day', () => {
    expect(streakStatus('2026-07-20', '2026-08-02')).toBe('broken');
  });
});

describe('applyDailyChallenge', () => {
  it('starts progress at 0 for a child who never played the challenge', () => {
    const profile = {};
    const result = applyDailyChallenge(profile, { date: '2026-08-02', correctCount: 3 });
    expect(result).toMatchObject({
      dailyChallengeDate: '2026-08-02',
      dailyChallengeProgress: 3,
      dailyChallengeCompleted: false,
      justCompletedDailyChallenge: false,
      bonusXp: 0,
      bonusCoins: 0,
    });
  });

  it('accumulates progress across sessions on the same day', () => {
    const profile = { dailyChallengeDate: '2026-08-02', dailyChallengeProgress: 3, dailyChallengeCompleted: false };
    const result = applyDailyChallenge(profile, { date: '2026-08-02', correctCount: 2 });
    expect(result.dailyChallengeProgress).toBe(5);
    expect(result.dailyChallengeCompleted).toBe(true);
    expect(result.justCompletedDailyChallenge).toBe(true);
    expect(result.bonusXp).toBeGreaterThan(0);
    expect(result.bonusCoins).toBeGreaterThan(0);
  });

  it('caps progress at the target and does not re-award the bonus once already completed', () => {
    const profile = { dailyChallengeDate: '2026-08-02', dailyChallengeProgress: 5, dailyChallengeCompleted: true };
    const result = applyDailyChallenge(profile, { date: '2026-08-02', correctCount: 4 });
    expect(result.dailyChallengeProgress).toBe(5);
    expect(result.justCompletedDailyChallenge).toBe(false);
    expect(result.bonusXp).toBe(0);
    expect(result.bonusCoins).toBe(0);
  });

  it('resets progress on a new day even if yesterday was completed', () => {
    const profile = { dailyChallengeDate: '2026-08-01', dailyChallengeProgress: 5, dailyChallengeCompleted: true };
    const result = applyDailyChallenge(profile, { date: '2026-08-02', correctCount: 2 });
    expect(result.dailyChallengeProgress).toBe(2);
    expect(result.dailyChallengeCompleted).toBe(false);
  });
});

describe('weekStartKey', () => {
  it('returns the same Monday for every day in that week', () => {
    expect(weekStartKey('2026-08-03')).toBe('2026-08-03'); // lundi
    expect(weekStartKey('2026-08-05')).toBe('2026-08-03'); // mercredi
    expect(weekStartKey('2026-08-09')).toBe('2026-08-03'); // dimanche
  });
  it('rolls over to the next Monday correctly', () => {
    expect(weekStartKey('2026-08-10')).toBe('2026-08-10'); // lundi suivant
  });
});

describe('applyWeeklyGoal', () => {
  it('starts progress at 1 for the first mission of the week', () => {
    const profile = { weeklyGoalTarget: 5 };
    const result = applyWeeklyGoal(profile, { date: '2026-08-03' });
    expect(result).toEqual({
      weeklyGoalWeekStart: '2026-08-03',
      weeklyGoalProgress: 1,
      weeklyGoalTarget: 5,
      weeklyGoalCompleted: false,
    });
  });

  it('accumulates progress across missions in the same week', () => {
    const profile = { weeklyGoalTarget: 3, weeklyGoalWeekStart: '2026-08-03', weeklyGoalProgress: 2 };
    const result = applyWeeklyGoal(profile, { date: '2026-08-05' });
    expect(result.weeklyGoalProgress).toBe(3);
    expect(result.weeklyGoalCompleted).toBe(true);
  });

  it('resets progress when a new week starts', () => {
    const profile = { weeklyGoalTarget: 3, weeklyGoalWeekStart: '2026-08-03', weeklyGoalProgress: 3 };
    const result = applyWeeklyGoal(profile, { date: '2026-08-10' });
    expect(result.weeklyGoalWeekStart).toBe('2026-08-10');
    expect(result.weeklyGoalProgress).toBe(1);
    expect(result.weeklyGoalCompleted).toBe(false);
  });

  it('is never completed when no target has been set', () => {
    const profile = {};
    const result = applyWeeklyGoal(profile, { date: '2026-08-03' });
    expect(result.weeklyGoalTarget).toBe(0);
    expect(result.weeklyGoalCompleted).toBe(false);
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

  it('detects mastery for the new division and fraction types too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 2, fraction: 1 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 3, fraction: 1 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['division']);
  });

  it('detects mastery for the new geometrie type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 2 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['geometrie']);
  });

  it('detects mastery for the new monnaie, longueur, and temps types too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 2, longueur: 2, temps: 2 };
    const next = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 3, longueur: 3, temps: 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['monnaie', 'longueur', 'temps']);
  });

  it('detects mastery for the new probleme type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 1, longueur: 1, temps: 1, probleme: 2 };
    const next = { ...previous, probleme: 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['probleme']);
  });

  it('detects mastery for the new accord-pluriel type too', () => {
    const previous = { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1, division: 1, fraction: 1, geometrie: 1, monnaie: 1, longueur: 1, temps: 1, probleme: 1, 'accord-pluriel': 2 };
    const next = { ...previous, 'accord-pluriel': 3 };
    expect(newlyMasteredTypes(previous, next)).toEqual(['accord-pluriel']);
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
    expect(result.totalCorrectCount).toBe(3);
    expect(result.gainedCoins).toBe(3);
    expect(result.coins).toBe(3);
    expect(result.badgeDates).toEqual({ 'streak-3': '2026-08-02' });
  });

  it('preserves existing badge unlock dates and adds new ones', () => {
    const profile = {
      xp: 0,
      avatarLevel: 1,
      streakDays: 6,
      badges: ['streak-3'],
      badgeDates: { 'streak-3': '2026-08-01' },
      lastSessionDate: '2026-08-01',
    };
    const summary = { date: '2026-08-02', correctCount: 1 };
    const result = applyProgression(profile, summary);
    expect(result.badgeDates).toEqual({ 'streak-3': '2026-08-01', 'streak-7': '2026-08-02' });
  });

  it('carries over the existing coin balance and adds the perfect-mission bonus', () => {
    const profile = { xp: 0, avatarLevel: 1, streakDays: 0, badges: [], lastSessionDate: null, coins: 20 };
    const summary = { date: '2026-08-02', correctCount: 10, questionsTotal: 10 };
    const result = applyProgression(profile, summary);
    expect(result.gainedCoins).toBe(15);
    expect(result.coins).toBe(35);
  });

  it('accumulates totalCorrectCount across sessions', () => {
    const profile = { xp: 0, avatarLevel: 1, streakDays: 0, badges: [], lastSessionDate: null, totalCorrectCount: 133 };
    const summary = { date: '2026-08-02', correctCount: 7 };
    const result = applyProgression(profile, summary);
    expect(result.totalCorrectCount).toBe(140);
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
