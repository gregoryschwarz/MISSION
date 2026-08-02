import { describe, it, expect, vi } from 'vitest';
import { hashPin } from '../../src/shared/pin.js';

vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  getDoc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';
import { pairWithFamily, getStoredFamilyId, storeFamilyId } from '../../src/child/pairing.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('pairWithFamily', () => {
  it('succeeds when the family exists and the pin matches', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithFamily({}, 'family-abc', '1234');
    expect(result).toEqual({ success: true, childName: 'Luna' });
  });

  it('fails when the pin does not match', async () => {
    const pinHash = await hashPin('1234');
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pinHash, childName: 'Luna' }),
    });
    const result = await pairWithFamily({}, 'family-abc', '0000');
    expect(result).toEqual({ success: false, reason: 'wrong-pin' });
  });

  it('fails when the family does not exist', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const result = await pairWithFamily({}, 'unknown', '1234');
    expect(result).toEqual({ success: false, reason: 'unknown-family' });
  });
});

describe('familyId storage', () => {
  it('stores and retrieves the family id', () => {
    const storage = createFakeStorage();
    storeFamilyId('family-abc', storage);
    expect(getStoredFamilyId(storage)).toBe('family-abc');
  });
});
