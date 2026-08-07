const MIN_LEVEL = 1;
const MAX_LEVEL = 3;
const LEVEL_UP_THRESHOLD = 0.8;
const LEVEL_DOWN_THRESHOLD = 0.5;

export const DEFAULT_DIFFICULTY_LEVELS = {
  addition: 1,
  soustraction: 1,
  multiplication: 1,
  comparaison: 1,
  division: 1,
  fraction: 1,
  geometrie: 1,
  monnaie: 1,
  longueur: 1,
  temps: 1,
  probleme: 1,
};

export const DIFFICULTY_LABELS = {
  1: 'Début',
  2: 'Confirmé',
  3: 'Avancé',
};

export function adjustDifficultyLevels(currentLevels, breakdown) {
  const nextLevels = { ...currentLevels };
  Object.entries(breakdown).forEach(([type, { correct, total }]) => {
    if (total === 0) return;
    const ratio = correct / total;
    const level = currentLevels[type] ?? MIN_LEVEL;
    if (ratio >= LEVEL_UP_THRESHOLD && level < MAX_LEVEL) {
      nextLevels[type] = level + 1;
    } else if (ratio < LEVEL_DOWN_THRESHOLD && level > MIN_LEVEL) {
      nextLevels[type] = level - 1;
    }
  });
  return nextLevels;
}
