const STORAGE_KEY = 'missionsDeLuna.lastMissionMode';
const ALL_MODES = ['quiz', 'qcm', 'pairs'];

export function pickMissionMode(lastMode) {
  const candidates = ALL_MODES.filter((mode) => mode !== lastMode);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getLastMissionMode(storage = window.localStorage) {
  return storage.getItem(STORAGE_KEY);
}

export function storeLastMissionMode(mode, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, mode);
}
