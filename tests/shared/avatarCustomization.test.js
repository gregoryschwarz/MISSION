import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  ACCESSORIES,
  DEFAULT_CHARACTER,
  DEFAULT_ACCESSORY,
  unlockedCharacters,
  unlockedAccessories,
  characterMedallionData,
  accessoryMedallionData,
  emojiForCharacter,
  emojiForAccessory,
} from '../../src/shared/avatarCustomization.js';

describe('CHARACTERS', () => {
  it('defines 3 characters with the unicorn unlocked from level 1', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'panda']);
    expect(CHARACTERS.find((c) => c.id === 'unicorn').requiredLevel).toBe(1);
  });
});

describe('ACCESSORIES', () => {
  it('defines 3 accessories with badge-based unlock conditions', () => {
    expect(ACCESSORIES.map((a) => a.id)).toEqual(['crown', 'star', 'flower']);
    expect(ACCESSORIES.find((a) => a.id === 'crown').requiresAnyOf).toEqual(['streak-30']);
    expect(ACCESSORIES.find((a) => a.id === 'flower').requiresAnyOf).toEqual(['perfect-10']);
  });

  it('unlocks the star with any of the 6 mastery badges', () => {
    const star = ACCESSORIES.find((a) => a.id === 'star');
    expect(star.requiresAnyOf).toEqual([
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
      'mastery-division',
      'mastery-fraction',
    ]);
  });
});

describe('DEFAULT_CHARACTER and DEFAULT_ACCESSORY', () => {
  it('defaults to the unicorn and no accessory', () => {
    expect(DEFAULT_CHARACTER).toBe('unicorn');
    expect(DEFAULT_ACCESSORY).toBe(null);
  });
});

describe('unlockedCharacters', () => {
  it('only the unicorn is unlocked at level 1', () => {
    expect(unlockedCharacters(1).map((c) => c.id)).toEqual(['unicorn']);
  });

  it('unlocks the butterfly at level 3', () => {
    expect(unlockedCharacters(3).map((c) => c.id)).toEqual(['unicorn', 'butterfly']);
  });

  it('unlocks the panda at level 5', () => {
    expect(unlockedCharacters(5).map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'panda']);
  });

  it('never returns duplicates or drops the unicorn at high levels', () => {
    const result = unlockedCharacters(9);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.id)).toContain('unicorn');
  });
});

describe('unlockedAccessories', () => {
  it('returns an empty list when no relevant badge is present', () => {
    expect(unlockedAccessories([])).toEqual([]);
    expect(unlockedAccessories(['streak-3'])).toEqual([]);
  });

  it('unlocks the crown with streak-30', () => {
    expect(unlockedAccessories(['streak-30']).map((a) => a.id)).toEqual(['crown']);
  });

  it('unlocks the star with any single mastery badge', () => {
    expect(unlockedAccessories(['mastery-division']).map((a) => a.id)).toEqual(['star']);
  });

  it('unlocks the flower with perfect-10', () => {
    expect(unlockedAccessories(['perfect-10']).map((a) => a.id)).toEqual(['flower']);
  });

  it('unlocks multiple accessories at once when multiple badges are present', () => {
    const result = unlockedAccessories(['streak-30', 'mastery-fraction', 'perfect-10']);
    expect(result.map((a) => a.id)).toEqual(['crown', 'star', 'flower']);
  });
});

describe('characterMedallionData', () => {
  it('marks only the unicorn as unlocked at level 1', () => {
    const result = characterMedallionData(1);
    expect(result).toHaveLength(3);
    expect(result.find((c) => c.id === 'unicorn').unlocked).toBe(true);
    expect(result.find((c) => c.id === 'butterfly').unlocked).toBe(false);
    expect(result.find((c) => c.id === 'panda').unlocked).toBe(false);
  });

  it('marks the butterfly as unlocked at level 3', () => {
    const result = characterMedallionData(3);
    expect(result.find((c) => c.id === 'butterfly').unlocked).toBe(true);
    expect(result.find((c) => c.id === 'panda').unlocked).toBe(false);
  });
});

describe('accessoryMedallionData', () => {
  it('marks no accessory as unlocked with an empty badge list', () => {
    const result = accessoryMedallionData([]);
    expect(result).toHaveLength(3);
    result.forEach((a) => expect(a.unlocked).toBe(false));
  });

  it('marks only the crown as unlocked with streak-30', () => {
    const result = accessoryMedallionData(['streak-30']);
    expect(result.find((a) => a.id === 'crown').unlocked).toBe(true);
    expect(result.find((a) => a.id === 'star').unlocked).toBe(false);
    expect(result.find((a) => a.id === 'flower').unlocked).toBe(false);
  });
});

describe('emojiForCharacter', () => {
  it('returns the emoji for a known character id', () => {
    expect(emojiForCharacter('panda')).toBe('🐼');
  });

  it('falls back to the default character for an unknown id', () => {
    expect(emojiForCharacter('unknown')).toBe('🦄');
  });
});

describe('emojiForAccessory', () => {
  it('returns the emoji for a known accessory id', () => {
    expect(emojiForAccessory('crown')).toBe('👑');
  });

  it('returns null for a null accessory id', () => {
    expect(emojiForAccessory(null)).toBe(null);
  });

  it('returns null for an unknown accessory id', () => {
    expect(emojiForAccessory('unknown')).toBe(null);
  });
});
