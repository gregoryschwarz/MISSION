const STORAGE_KEY = 'missionsDeLuna.pendingSessions';

export function readQueue(storage = window.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function enqueueSession(summary, storage = window.localStorage) {
  const pending = readQueue(storage);
  pending.push(summary);
  storage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export async function flushQueue(writeSession, storage = window.localStorage) {
  const initialCount = readQueue(storage).length;
  let synced = 0;
  let failed = 0;
  for (let i = 0; i < initialCount; i++) {
    const current = readQueue(storage);
    if (current.length === 0) break;
    const [next, ...rest] = current;
    try {
      await writeSession(next);
      storage.setItem(STORAGE_KEY, JSON.stringify(rest));
      synced += 1;
    } catch (err) {
      storage.setItem(STORAGE_KEY, JSON.stringify([...rest, next]));
      failed += 1;
    }
  }
  return { synced, failed };
}
