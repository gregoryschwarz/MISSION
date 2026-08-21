import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  HATS,
  CAPES,
  DECORS,
  DEFAULT_CHARACTER,
  DEFAULT_HAT,
  DEFAULT_CAPE,
  DEFAULT_DECOR,
  unlockedCharacters,
  unlockedHats,
  unlockedCapes,
  unlockedDecors,
  characterMedallionData,
  hatMedallionData,
  capeMedallionData,
  decorMedallionData,
  emojiForCharacter,
  emojiForHat,
  emojiForCape,
  visualForCharacter,
  decorGradientCss,
} from '../../src/shared/avatarCustomization.js';

describe('CHARACTERS', () => {
  it('defines 9 characters with the unicorn unlocked from level 1', () => {
    expect(CHARACTERS).toHaveLength(9);
    expect(CHARACTERS.find((c) => c.id === 'unicorn').requiredLevel).toBe(1);
  });

  it('spreads required levels from 1 to 9 without duplicates', () => {
    const levels = CHARACTERS.map((c) => c.requiredLevel).sort((a, b) => a - b);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('gives every character a coin cost, free for the default unicorn', () => {
    expect(CHARACTERS.find((c) => c.id === 'unicorn').cost).toBe(0);
    CHARACTERS.forEach((c) => expect(typeof c.cost).toBe('number'));
  });
});

describe('HATS and CAPES', () => {
  it('defines 4 hats including a free "none" option', () => {
    expect(HATS).toHaveLength(12);
    expect(HATS.find((h) => h.id === 'none-hat').requiresAnyOf).toEqual([]);
    expect(HATS.find((h) => h.id === 'crown').requiresAnyOf).toEqual(['streak-30']);
  });

  it('defines 4 capes including a free "none" option', () => {
    expect(CAPES).toHaveLength(12);
    expect(CAPES.find((c) => c.id === 'none-cape').requiresAnyOf).toEqual([]);
    expect(CAPES.find((c) => c.id === 'star-cape').requiresAnyOf).toEqual(['streak-7']);
  });
});

describe('DECORS', () => {
  it('defines the 8 named décors from the cahier des charges, unlocked by level', () => {
    expect(DECORS.map((d) => d.name)).toEqual([
      'Menthe',
      'Crème',
      'Soleil',
      'Corail',
      'Forêt',
      'Bonbon',
      'Arc-en-ciel',
      'Nuit étoilée',
    ]);
    expect(DECORS.map((d) => d.requiredLevel)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('defaults', () => {
  it('defaults to the unicorn, no hat, no cape, and the Menthe décor', () => {
    expect(DEFAULT_CHARACTER).toBe('unicorn');
    expect(DEFAULT_HAT).toBe('none-hat');
    expect(DEFAULT_CAPE).toBe('none-cape');
    expect(DEFAULT_DECOR).toBe('menthe');
  });
});

describe('unlockedCharacters', () => {
  it('only the unicorn is unlocked at level 1', () => {
    expect(unlockedCharacters(1).map((c) => c.id)).toEqual(['unicorn']);
  });

  it('unlocks progressively as the level rises', () => {
    expect(unlockedCharacters(3).map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'cat']);
    expect(unlockedCharacters(9)).toHaveLength(9);
  });

  it('also unlocks a character purchased with coins regardless of level', () => {
    const result = unlockedCharacters(1, ['dragon']);
    expect(result.map((c) => c.id)).toEqual(['unicorn', 'dragon']);
  });

  it('does not duplicate a character both unlocked by level and owned', () => {
    const result = unlockedCharacters(3, ['unicorn', 'butterfly']);
    expect(result.map((c) => c.id)).toEqual(['unicorn', 'butterfly', 'cat']);
  });
});

describe('unlockedHats and unlockedCapes', () => {
  it('always includes the free "none" option even with no badges', () => {
    expect(unlockedHats([]).map((h) => h.id)).toEqual(['none-hat']);
    expect(unlockedCapes([]).map((c) => c.id)).toEqual(['none-cape']);
  });

  it('unlocks the crown with streak-30', () => {
    expect(unlockedHats(['streak-30']).map((h) => h.id)).toEqual(['none-hat', 'crown']);
  });

  it('unlocks the top-hat with any single mastery badge', () => {
    expect(unlockedHats(['mastery-division']).map((h) => h.id)).toEqual(['none-hat', 'top-hat']);
  });

  it('unlocks the star-cape with streak-7', () => {
    expect(unlockedCapes(['streak-7']).map((c) => c.id)).toEqual(['none-cape', 'star-cape']);
  });

  it('unlocks the diamond-cape with perfect-50', () => {
    expect(unlockedCapes(['perfect-50']).map((c) => c.id)).toEqual(['none-cape', 'diamond-cape']);
  });
});

describe('unlockedDecors', () => {
  it('only Menthe is unlocked at level 1', () => {
    expect(unlockedDecors(1).map((d) => d.id)).toEqual(['menthe']);
  });

  it('unlocks all 8 décors at level 8 or above', () => {
    expect(unlockedDecors(8)).toHaveLength(8);
    expect(unlockedDecors(12)).toHaveLength(8);
  });
});

describe('characterMedallionData', () => {
  it('marks only the unicorn as unlocked at level 1', () => {
    const result = characterMedallionData(1);
    expect(result).toHaveLength(9);
    expect(result.find((c) => c.id === 'unicorn').unlocked).toBe(true);
    expect(result.find((c) => c.id === 'dragon').unlocked).toBe(false);
  });

  it('marks a purchased character as unlocked even below its required level', () => {
    const result = characterMedallionData(1, ['dragon']);
    expect(result.find((c) => c.id === 'dragon').unlocked).toBe(true);
  });

  it('carries the coin cost on every entry', () => {
    const result = characterMedallionData(1);
    expect(result.find((c) => c.id === 'dragon').cost).toBe(100);
  });
});

describe('hatMedallionData and capeMedallionData', () => {
  it('marks only the free option as unlocked with an empty badge list', () => {
    const hats = hatMedallionData([]);
    expect(hats.find((h) => h.id === 'none-hat').unlocked).toBe(true);
    expect(hats.find((h) => h.id === 'crown').unlocked).toBe(false);

    const capes = capeMedallionData([]);
    expect(capes.find((c) => c.id === 'none-cape').unlocked).toBe(true);
    expect(capes.find((c) => c.id === 'star-cape').unlocked).toBe(false);
  });
});

describe('decorMedallionData', () => {
  it('marks décors unlocked according to avatar level', () => {
    const result = decorMedallionData(4);
    expect(result.find((d) => d.id === 'corail').unlocked).toBe(true);
    expect(result.find((d) => d.id === 'foret').unlocked).toBe(false);
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

describe('visualForCharacter', () => {
  it('returns a complete block-avatar palette and falls back safely', () => {
    expect(visualForCharacter('panda')).toMatchObject({ id: 'panda', name: 'Aya magicienne' });
    expect(visualForCharacter('panda').skin).toMatch(/^#/);
    expect(visualForCharacter('unknown').id).toBe(DEFAULT_CHARACTER);
  });

  it('unlocks level accessories progressively', () => {
    expect(unlockedHats([], 2).map((h) => h.id)).toContain('round-glasses');
    expect(unlockedHats([], 1).map((h) => h.id)).not.toContain('round-glasses');
    expect(unlockedCapes([], 2).map((c) => c.id)).toContain('backpack');
  });
});

describe('emojiForHat and emojiForCape', () => {
  it('returns null for the "none" options and for missing/unknown ids', () => {
    expect(emojiForHat('none-hat')).toBe(null);
    expect(emojiForHat(null)).toBe(null);
    expect(emojiForHat('unknown')).toBe(null);
    expect(emojiForCape('none-cape')).toBe(null);
    expect(emojiForCape(null)).toBe(null);
  });

  it('returns the emoji for a known hat or cape id', () => {
    expect(emojiForHat('crown')).toBe('👑');
    expect(emojiForCape('rainbow-cape')).toBe('🌈');
  });
});

describe('decorGradientCss', () => {
  it('returns a two-stop linear-gradient for a simple décor', () => {
    expect(decorGradientCss('soleil')).toBe('linear-gradient(160deg, #ffd166, #ffb84d)');
  });

  it('supports multi-stop gradients like arc-en-ciel', () => {
    expect(decorGradientCss('arc-en-ciel')).toBe(
      'linear-gradient(160deg, #ef476f, #ffd166, #06d6a0, #118ab2)'
    );
  });

  it('falls back to the default décor for an unknown id', () => {
    expect(decorGradientCss('unknown')).toBe(decorGradientCss('menthe'));
  });
});
