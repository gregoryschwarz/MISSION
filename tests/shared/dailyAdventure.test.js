import { describe, expect, it } from 'vitest';
import { DAILY_ADVENTURE_TARGET, RARE_TREASURES, claimDailyAdventureChest, dailyAdventureState } from '../../src/shared/dailyAdventure.js';

describe('dailyAdventureState', () => {
  it('tracks three missions and resets on a new day', () => {
    const profile = { dailyMissionCountDate: '2026-08-22', dailyMissionCount: 2 };
    expect(dailyAdventureState(profile, '2026-08-22')).toMatchObject({ progress: 2, target: DAILY_ADVENTURE_TARGET, completed: false });
    expect(dailyAdventureState(profile, '2026-08-23')).toMatchObject({ progress: 0, completed: false });
  });
});

describe('claimDailyAdventureChest', () => {
  it('requires three completed missions and can only be claimed once a day', () => {
    expect(claimDailyAdventureChest({}, { date: '2026-08-22', completedMissions: 2 })).toEqual({ success: false, reason: 'incomplete' });
    expect(claimDailyAdventureChest({ dailyChestDate: '2026-08-22' }, { date: '2026-08-22', completedMissions: 3 })).toEqual({ success: false, reason: 'already-claimed' });
  });

  it('awards coins for every chest and a rare treasure every third chest', () => {
    const normal = claimDailyAdventureChest({}, { date: '2026-08-22', completedMissions: 3 });
    expect(normal).toMatchObject({ success: true, bonusCoins: 20, dailyChestCount: 1, treasure: null });
    const rare = claimDailyAdventureChest({ dailyChestCount: 2, rareTreasureIds: [] }, { date: '2026-08-23', completedMissions: 3 });
    expect(rare).toMatchObject({ success: true, bonusCoins: 30, dailyChestCount: 3, treasure: RARE_TREASURES[0] });
    expect(rare.rareTreasureIds).toEqual([RARE_TREASURES[0].id]);
  });

  it('never gives the same rare treasure twice', () => {
    const rare = claimDailyAdventureChest(
      { dailyChestCount: 5, rareTreasureIds: [RARE_TREASURES[0].id] },
      { date: '2026-08-24', completedMissions: 3 }
    );
    expect(rare.treasure.id).not.toBe(RARE_TREASURES[0].id);
    expect(rare.rareTreasureIds).toEqual([RARE_TREASURES[0].id, rare.treasure.id]);
  });
});
