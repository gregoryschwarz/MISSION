import { describe, it, expect } from 'vitest';
import { auraClassForLevel } from '../../src/child/avatar.js';

describe('auraClassForLevel', () => {
  it('returns aura-1 for level 1', () => {
    expect(auraClassForLevel(1)).toBe('aura-1');
  });

  it('returns aura-2 for level 2', () => {
    expect(auraClassForLevel(2)).toBe('aura-2');
  });

  it('returns aura-3 for level 3', () => {
    expect(auraClassForLevel(3)).toBe('aura-3');
  });

  it('returns aura-4 for level 4', () => {
    expect(auraClassForLevel(4)).toBe('aura-4');
  });

  it('returns aura-5 for level 5 and above', () => {
    expect(auraClassForLevel(5)).toBe('aura-5');
    expect(auraClassForLevel(9)).toBe('aura-5');
  });
});
