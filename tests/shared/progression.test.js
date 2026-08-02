import { describe, it, expect } from 'vitest';
import {
  xpForSession,
  levelForXp,
  updateStreak,
  newlyEarnedBadges,
  applyProgression,
} from '../../src/shared/progression.js';

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
});
