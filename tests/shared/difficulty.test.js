import { describe, it, expect } from 'vitest';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from '../../src/shared/difficulty.js';

describe('DEFAULT_DIFFICULTY_LEVELS', () => {
  it('starts every type at level 1', () => {
    expect(DEFAULT_DIFFICULTY_LEVELS).toEqual({
      addition: 1,
      soustraction: 1,
      multiplication: 1,
      comparaison: 1,
    });
  });
});

describe('DIFFICULTY_LABELS', () => {
  it('provides French labels for all 3 levels', () => {
    expect(DIFFICULTY_LABELS).toEqual({ 1: 'Début', 2: 'Confirmé', 3: 'Avancé' });
  });
});

describe('adjustDifficultyLevels', () => {
  it('levels up a type when accuracy is 80% or higher', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 4, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('levels down a type when accuracy is below 50%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 2, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('keeps the level unchanged between 50% and 80%', () => {
    const result = adjustDifficultyLevels(
      { addition: 2, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 3, total: 5 } }
    );
    expect(result.addition).toBe(2);
  });

  it('never goes above level 3', () => {
    const result = adjustDifficultyLevels(
      { addition: 3, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.addition).toBe(3);
  });

  it('never goes below level 1', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 1, multiplication: 1, comparaison: 1 },
      { addition: { correct: 0, total: 5 } }
    );
    expect(result.addition).toBe(1);
  });

  it('leaves types absent from the breakdown unchanged', () => {
    const result = adjustDifficultyLevels(
      { addition: 1, soustraction: 2, multiplication: 1, comparaison: 3 },
      { addition: { correct: 5, total: 5 } }
    );
    expect(result.soustraction).toBe(2);
    expect(result.multiplication).toBe(1);
    expect(result.comparaison).toBe(3);
  });
});
