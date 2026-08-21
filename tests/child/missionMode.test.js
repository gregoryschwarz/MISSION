import { describe, it, expect } from 'vitest';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from '../../src/child/missionMode.js';

const ALL_MODES = ['quiz', 'qcm', 'pairs'];

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('pickMissionMode', () => {
  it('never returns the same mode as lastMode', () => {
    ALL_MODES.forEach((lastMode) => {
      for (let i = 0; i < 30; i++) {
        expect(pickMissionMode(lastMode)).not.toBe(lastMode);
      }
    });
  });

  it('only returns known modes', () => {
    for (let i = 0; i < 30; i++) {
      expect(ALL_MODES).toContain(pickMissionMode('quiz'));
    }
  });

  it('rotates through free input, QCM and pairs in a predictable order', () => {
    expect(pickMissionMode(null)).toBe('quiz');
    expect(pickMissionMode('quiz')).toBe('qcm');
    expect(pickMissionMode('qcm')).toBe('pairs');
    expect(pickMissionMode('pairs')).toBe('quiz');
  });

  it('starts with free input when there is no valid history', () => {
    expect(pickMissionMode(null)).toBe('quiz');
    expect(pickMissionMode('unknown')).toBe('quiz');
  });
});

describe('mission mode storage', () => {
  it('returns null when nothing is stored', () => {
    const storage = createFakeStorage();
    expect(getLastMissionMode(storage)).toBe(null);
  });

  it('stores and retrieves the last mission mode', () => {
    const storage = createFakeStorage();
    storeLastMissionMode('qcm', storage);
    expect(getLastMissionMode(storage)).toBe('qcm');
  });
});
