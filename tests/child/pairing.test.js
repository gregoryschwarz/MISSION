import { describe, it, expect, vi } from 'vitest';
import { hashPin } from '../../src/shared/pin.js';

vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  getDoc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';
import { pairWithChild, getStoredChildId, storeChildId } from '../../src/child/pairing.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('pairWithChild', () => {
  it('succeeds when the child exists and the pin matches', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithChild({}, 'child-abc', '1234');
    expect(result).toEqual({ success: true, childName: 'Luna' });
  });

  it('fails when the pin does not match', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithChild({}, 'child-abc', '0000');
    expect(result).toEqual({ success: false, reason: 'wrong-pin' });
  });

  it('fails when the child does not exist', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const result = await pairWithChild({}, 'unknown', '1234');
    expect(result).toEqual({ success: false, reason: 'unknown-child' });
  });
});

describe('childId storage', () => {
  it('stores and retrieves the child id', () => {
    const storage = createFakeStorage();
    storeChildId('child-abc', storage);
    expect(getStoredChildId(storage)).toBe('child-abc');
  });
});
