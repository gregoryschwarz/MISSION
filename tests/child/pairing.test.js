import { describe, it, expect, vi } from 'vitest';
vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

import { getDoc, setDoc } from 'firebase/firestore';
import { resolvePairingCode, requestPairing, pairingStatus, getStoredChildId, storeChildId, clearStoredChildId } from '../../src/child/pairing.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

describe('secure pairing request', () => {
  it('resolves a short code without reading the child profile', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ childId: 'child-abc' }) });
    expect(await resolvePairingCode({}, ' m7k4qp ')).toBe('child-abc');
  });

  it('creates a pending request owned by the anonymous device', async () => {
    const result = await requestPairing({}, 'child-abc', 'device-1');
    expect(result).toEqual({ success: true, status: 'pending' });
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { requesterUid: 'device-1', status: 'pending', requestedAt: 'SERVER_TIMESTAMP' }
    );
  });

  it('does not disclose whether a protected child exists on permission denial', async () => {
    setDoc.mockRejectedValueOnce({ code: 'permission-denied' });
    expect(await requestPairing({}, 'unknown', 'device-1')).toEqual({ success: false, reason: 'unknown-child' });
  });

  it('reads only the device own approval status', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ status: 'approved' }) });
    expect(await pairingStatus({}, 'child-abc', 'device-1')).toBe('approved');
  });
});

describe('childId storage', () => {
  it('stores and retrieves the child id', () => {
    const storage = createFakeStorage();
    storeChildId('child-abc', storage);
    expect(getStoredChildId(storage)).toBe('child-abc');
    clearStoredChildId(storage);
    expect(getStoredChildId(storage)).toBe(null);
  });
});
