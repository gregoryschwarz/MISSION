import { describe, it, expect } from 'vitest';
import { isSoundEnabled, setSoundEnabled } from '../../src/child/sound.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('isSoundEnabled', () => {
  it('defaults to true when nothing is stored', () => {
    const storage = createFakeStorage();
    expect(isSoundEnabled(storage)).toBe(true);
  });

  it('returns false after being explicitly disabled', () => {
    const storage = createFakeStorage();
    setSoundEnabled(false, storage);
    expect(isSoundEnabled(storage)).toBe(false);
  });

  it('returns true after being explicitly re-enabled', () => {
    const storage = createFakeStorage();
    setSoundEnabled(false, storage);
    setSoundEnabled(true, storage);
    expect(isSoundEnabled(storage)).toBe(true);
  });
});
