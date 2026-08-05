import { describe, it, expect } from 'vitest';
import {
  additionHint,
  subtractionHint,
  multiplicationHint,
  divisionHint,
  dynamicHintSteps,
} from '../../src/child/hints.js';

describe('additionHint', () => {
  it('describes a simple addition with no carry', () => {
    expect(additionHint(12, 3)).toEqual([
      'Unités : 2 + 3 = 5.',
      'Dizaines : 1 + 0 = 1.',
      'Résultat : 12 + 3 = 15.',
    ]);
  });

  it('describes an addition with a single carry', () => {
    expect(additionHint(27, 15)).toEqual([
      'Unités : 7 + 5 = 12 → tu poses 2 et retiens 1.',
      'Dizaines : 2 + 1 + 1 (retenue) = 4.',
      'Résultat : 27 + 15 = 42.',
    ]);
  });

  it('describes a carry that overflows into a new column', () => {
    expect(additionHint(95, 8)).toEqual([
      'Unités : 5 + 8 = 13 → tu poses 3 et retiens 1.',
      'Dizaines : 9 + 0 + 1 (retenue) = 10 → tu poses 0 et retiens 1.',
      'Centaines : tu poses la retenue 1.',
      'Résultat : 95 + 8 = 103.',
    ]);
  });

  it('handles 3-digit numbers', () => {
    expect(additionHint(234, 567)).toEqual([
      'Unités : 4 + 7 = 11 → tu poses 1 et retiens 1.',
      'Dizaines : 3 + 6 + 1 (retenue) = 10 → tu poses 0 et retiens 1.',
      'Centaines : 2 + 5 + 1 (retenue) = 8.',
      'Résultat : 234 + 567 = 801.',
    ]);
  });
});

describe('subtractionHint', () => {
  it('describes a simple subtraction with no borrow', () => {
    expect(subtractionHint(38, 15)).toEqual([
      'Unités : 8 - 5 = 3.',
      'Dizaines : 3 - 1 = 2.',
      'Résultat : 38 - 15 = 23.',
    ]);
  });

  it('describes a subtraction with a single borrow', () => {
    expect(subtractionHint(42, 15)).toEqual([
      'Unités : Tu ne peux pas faire 2 - 5, tu empruntes 1 à la colonne suivante : 12 - 5 = 7.',
      'Dizaines : 3 - 1 = 2.',
      'Résultat : 42 - 15 = 27.',
    ]);
  });

  it('describes a borrow cascading through a zero digit', () => {
    expect(subtractionHint(100, 45)).toEqual([
      'Unités : Tu ne peux pas faire 0 - 5, tu empruntes 1 à la colonne suivante : 10 - 5 = 5.',
      "Dizaines : la colonne précédente a emprunté, donc ici c'est 9. 9 - 4 = 5.",
      'Centaines : 0 - 0 = 0.',
      'Résultat : 100 - 45 = 55.',
    ]);
  });
});

describe('multiplicationHint', () => {
  it('uses repeated addition when the smaller factor is 5 or less', () => {
    expect(multiplicationHint(2, 5)).toEqual([
      "2 × 5, c'est 5 répété 2 fois : 5 + 5 = 10.",
      'Résultat : 2 × 5 = 10.',
    ]);
  });

  it('references the multiplication table for two distinct larger factors', () => {
    expect(multiplicationHint(6, 7)).toEqual([
      '6 × 7 : utilise ta table de multiplication de 6 (ou de 7).',
      'Résultat : 6 × 7 = 42.',
    ]);
  });

  it('references a single table when both larger factors are equal', () => {
    expect(multiplicationHint(6, 6)).toEqual([
      '6 × 6 : utilise ta table de multiplication de 6.',
      'Résultat : 6 × 6 = 36.',
    ]);
  });
});

describe('divisionHint', () => {
  it('lists the multiples up to the dividend', () => {
    expect(divisionHint(12, 3)).toEqual([
      '12 ÷ 3 : combien de fois 3 dans 12 ? Compte les multiples de 3 : 3, 6, 9, 12.',
      'Résultat : 12 ÷ 3 = 4.',
    ]);
  });

  it('handles a quotient of 1', () => {
    expect(divisionHint(5, 5)).toEqual([
      '5 ÷ 5 : combien de fois 5 dans 5 ? Compte les multiples de 5 : 5.',
      'Résultat : 5 ÷ 5 = 1.',
    ]);
  });

  it('handles the maximum quotient of 10', () => {
    expect(divisionHint(20, 2)).toEqual([
      '20 ÷ 2 : combien de fois 2 dans 20 ? Compte les multiples de 2 : 2, 4, 6, 8, 10, 12, 14, 16, 18, 20.',
      'Résultat : 20 ÷ 2 = 10.',
    ]);
  });
});

describe('dynamicHintSteps', () => {
  it('routes to additionHint for addition questions', () => {
    expect(dynamicHintSteps({ type: 'addition', a: 12, b: 3 })).toEqual(additionHint(12, 3));
  });

  it('routes to subtractionHint for soustraction questions', () => {
    expect(dynamicHintSteps({ type: 'soustraction', a: 38, b: 15 })).toEqual(subtractionHint(38, 15));
  });

  it('routes to multiplicationHint for multiplication questions', () => {
    expect(dynamicHintSteps({ type: 'multiplication', a: 6, b: 7 })).toEqual(multiplicationHint(6, 7));
  });

  it('routes to divisionHint for division questions', () => {
    expect(dynamicHintSteps({ type: 'division', a: 12, b: 3 })).toEqual(divisionHint(12, 3));
  });

  it('returns null for comparaison questions', () => {
    expect(dynamicHintSteps({ type: 'comparaison', a: 4, b: 7 })).toBe(null);
  });

  it('returns null for fraction questions', () => {
    expect(dynamicHintSteps({ type: 'fraction', a: { numerator: 1, denominator: 3 }, b: { numerator: 2, denominator: 3 } })).toBe(null);
  });
});
