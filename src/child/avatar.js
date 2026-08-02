export function auraClassForLevel(avatarLevel) {
  if (avatarLevel >= 5) return 'aura-5';
  if (avatarLevel >= 4) return 'aura-4';
  if (avatarLevel >= 3) return 'aura-3';
  if (avatarLevel >= 2) return 'aura-2';
  return 'aura-1';
}
