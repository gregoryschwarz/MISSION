const STORAGE_KEY = 'missionsDeLuna.pendingSessions';

export function readQueue(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function enqueueSession(summary, storage = window.localStorage) {
  const pending = readQueue(storage);
  pending.push(summary);
  storage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export async function flushQueue(writeSession, storage = window.localStorage) {
  const pending = readQueue(storage);
  const remaining = [];
  for (const summary of pending) {
    try {
      await writeSession(summary);
    } catch (err) {
      remaining.push(summary);
    }
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { synced: pending.length - remaining.length, failed: remaining.length };
}
