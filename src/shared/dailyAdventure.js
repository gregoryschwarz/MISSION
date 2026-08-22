export const DAILY_ADVENTURE_TARGET = 3;

export const RARE_TREASURES = [
  { id: 'moon-crystal', emoji: '🌙', name: 'Cristal de lune', rarity: 'Rare' },
  { id: 'rainbow-feather', emoji: '🪶', name: 'Plume arc-en-ciel', rarity: 'Rare' },
  { id: 'golden-key', emoji: '🗝️', name: 'Clé dorée', rarity: 'Rare' },
  { id: 'star-pearl', emoji: '🔮', name: 'Perle des étoiles', rarity: 'Rare' },
  { id: 'dragon-scale', emoji: '🐉', name: 'Écaille de dragon', rarity: 'Rare' },
  { id: 'magic-flower', emoji: '🌺', name: 'Fleur enchantée', rarity: 'Rare' },
];

export function dailyAdventureState(profile = {}, today) {
  const progress = profile.dailyMissionCountDate === today ? profile.dailyMissionCount ?? 0 : 0;
  return {
    progress: Math.min(progress, DAILY_ADVENTURE_TARGET),
    target: DAILY_ADVENTURE_TARGET,
    completed: progress >= DAILY_ADVENTURE_TARGET,
    chestClaimed: profile.dailyChestDate === today,
  };
}

export function claimDailyAdventureChest(profile = {}, { date, completedMissions }) {
  if (completedMissions < DAILY_ADVENTURE_TARGET) return { success: false, reason: 'incomplete' };
  if (profile.dailyChestDate === date) return { success: false, reason: 'already-claimed' };
  const dailyChestCount = (profile.dailyChestCount ?? 0) + 1;
  const rareUnlocked = dailyChestCount % 3 === 0;
  const ownedTreasures = profile.rareTreasureIds ?? [];
  const availableTreasures = RARE_TREASURES.filter((treasure) => !ownedTreasures.includes(treasure.id));
  const treasure = rareUnlocked && availableTreasures.length
    ? availableTreasures[(dailyChestCount / 3 - 1) % availableTreasures.length]
    : null;
  const bonusCoins = treasure ? 30 : 20;
  return {
    success: true,
    dailyChestDate: date,
    dailyChestCount,
    bonusCoins,
    treasure,
    rareTreasureIds: treasure ? [...ownedTreasures, treasure.id] : ownedTreasures,
  };
}

