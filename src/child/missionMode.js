const STORAGE_KEY = 'missionsDeLuna.lastMissionMode';
const ALL_MODES = ['quiz', 'qcm', 'pairs'];

export function pickMissionMode(lastMode) {
  const currentIndex = ALL_MODES.indexOf(lastMode);
  return currentIndex === -1 ? ALL_MODES[0] : ALL_MODES[(currentIndex + 1) % ALL_MODES.length];
}

export function getLastMissionMode(storage = window.localStorage) {
  return storage.getItem(STORAGE_KEY);
}

export function storeLastMissionMode(mode, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, mode);
}
