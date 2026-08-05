export const CHARACTERS = [
  { id: 'unicorn', emoji: '🦄', requiredLevel: 1 },
  { id: 'butterfly', emoji: '🦋', requiredLevel: 3 },
  { id: 'panda', emoji: '🐼', requiredLevel: 5 },
];

const MASTERY_BADGE_IDS = [
  'mastery-addition',
  'mastery-soustraction',
  'mastery-multiplication',
  'mastery-comparaison',
  'mastery-division',
  'mastery-fraction',
];

export const ACCESSORIES = [
  { id: 'crown', emoji: '👑', requiresAnyOf: ['streak-30'] },
  { id: 'star', emoji: '⭐', requiresAnyOf: MASTERY_BADGE_IDS },
  { id: 'flower', emoji: '🌸', requiresAnyOf: ['perfect-10'] },
];

export const DEFAULT_CHARACTER = 'unicorn';
export const DEFAULT_ACCESSORY = null;

export function unlockedCharacters(avatarLevel) {
  return CHARACTERS.filter((c) => avatarLevel >= c.requiredLevel);
}

export function unlockedAccessories(badges) {
  return ACCESSORIES.filter((a) => a.requiresAnyOf.some((id) => badges.includes(id)));
}

export function characterMedallionData(avatarLevel) {
  const unlockedIds = unlockedCharacters(avatarLevel).map((c) => c.id);
  return CHARACTERS.map((c) => ({ ...c, unlocked: unlockedIds.includes(c.id) }));
}

export function accessoryMedallionData(badges) {
  const unlockedIds = unlockedAccessories(badges).map((a) => a.id);
  return ACCESSORIES.map((a) => ({ ...a, unlocked: unlockedIds.includes(a.id) }));
}

export function emojiForCharacter(characterId) {
  const found = CHARACTERS.find((c) => c.id === characterId);
  return found ? found.emoji : CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER).emoji;
}

export function emojiForAccessory(accessoryId) {
  if (!accessoryId) return null;
  const found = ACCESSORIES.find((a) => a.id === accessoryId);
  return found ? found.emoji : null;
}
