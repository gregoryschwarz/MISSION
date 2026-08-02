import { describe, it, expect, vi } from 'vitest';
import { enqueueSession, readQueue, flushQueue } from '../../src/shared/syncQueue.js';

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe('enqueueSession / readQueue', () => {
  it('stores sessions and reads them back in order', () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    enqueueSession({ date: '2026-08-02' }, storage);
    expect(readQueue(storage)).toEqual([{ date: '2026-08-01' }, { date: '2026-08-02' }]);
  });
});

describe('flushQueue', () => {
  it('removes sessions that sync successfully', async () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    const writeSession = vi.fn().mockResolvedValue(undefined);
    const result = await flushQueue(writeSession, storage);
    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(readQueue(storage)).toEqual([]);
  });

  it('keeps sessions that fail to sync', async () => {
    const storage = createFakeStorage();
    enqueueSession({ date: '2026-08-01' }, storage);
    const writeSession = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await flushQueue(writeSession, storage);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(readQueue(storage)).toHaveLength(1);
  });

  it('handles a mix of successful and failed syncs', async () => {
    const storage = createFakeStorage();
    enqueueSession({ id: 1 }, storage);
    enqueueSession({ id: 2 }, storage);
    enqueueSession({ id: 3 }, storage);

    const writeSession = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    const result = await flushQueue(writeSession, storage);
    expect(result).toEqual({ synced: 2, failed: 1 });
    expect(readQueue(storage)).toEqual([{ id: 2 }]);
  });

  it('preserves a session enqueued concurrently while another is being flushed', async () => {
    const storage = createFakeStorage();
    enqueueSession({ id: 'A' }, storage);

    const writeSession = vi.fn().mockImplementation(async (session) => {
      if (session.id === 'A') {
        // Simulate the child app finishing a second mission and appending
        // to the queue while this background sync of A is still in flight.
        enqueueSession({ id: 'B' }, storage);
      }
    });

    const result = await flushQueue(writeSession, storage);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(readQueue(storage)).toEqual([{ id: 'B' }]);
  });
});
