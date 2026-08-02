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
    const before = readQueue(storage);
    if (before.length === 0) break;
    const next = before[0];
    let success = true;
    try {
      await writeSession(next);
    } catch (err) {
      success = false;
    }
    const latest = readQueue(storage);
    const remaining = latest.slice(1);
    if (success) {
      storage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      synced += 1;
    } else {
      storage.setItem(STORAGE_KEY, JSON.stringify([...remaining, next]));
      failed += 1;
    }
  }
  return { synced, failed };
}
