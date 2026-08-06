import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { randomInt, shuffle } from './random.js';
import { shapeSides } from './shapes.js';

// Powers of ten (10, 100, ...) have only one nonzero digit worth 1: every
// digit-respecting subtrahend is therefore either 0 or the number itself, so
// no valid (positive, non-borrowing, non-trivial) subtraction exists for them.
function isPowerOfTen(n) {
  return /^10*$/.test(String(n));
}

// Picks each digit of b independently in [0, corresponding digit of a], which
// guarantees no borrowing. Rejects the all-zero (b === 0) and all-matching
// (b === a) outcomes so the difference is always strictly positive. Callers
// must not pass a power of ten (see isPowerOfTen) or this loop cannot terminate.
function noBorrowSubtrahend(a) {
  const digits = String(a).split('').map(Number);
  let bDigits;
  do {
    bDigits = digits.map((d) => randomInt(0, d));
  } while (bDigits.every((d) => d === 0) || bDigits.every((d, i) => d === digits[i]));
  return Number(bDigits.join(''));
}

const ADDITION_MAX_SUM = { 1: 100, 2: 200, 3: 999 };

export function generateAddition(level = 1) {
  const maxSum = ADDITION_MAX_SUM[level] ?? ADDITION_MAX_SUM[1];
  const a = randomInt(10, maxSum - 20);
  const b = randomInt(1, maxSum - 1 - a);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

const SUBTRACTION_NO_BORROW_MAX = { 1: 100, 2: 200 };

export function generateSubtraction(level = 1) {
  if (level >= 3) {
    const a = randomInt(100, 998);
    const b = randomInt(1, a - 1);
    return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
  }
  const maxValue = SUBTRACTION_NO_BORROW_MAX[level] ?? SUBTRACTION_NO_BORROW_MAX[1];
  let a;
  do {
    a = randomInt(10, maxValue - 1);
  } while (isPowerOfTen(a));
  const b = noBorrowSubtrahend(a);
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

const MULTIPLICATION_TABLES_BY_LEVEL = {
  1: [2, 5, 10],
  2: [2, 3, 4, 5, 10],
  3: [2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export function generateMultiplication(level = 1) {
  const tables = MULTIPLICATION_TABLES_BY_LEVEL[level] ?? MULTIPLICATION_TABLES_BY_LEVEL[1];
  const table = tables[randomInt(0, tables.length - 1)];
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

const COMPARISON_MAX = { 1: 99, 2: 499, 3: 998 };

export function generateComparison(level = 1) {
  const max = COMPARISON_MAX[level] ?? COMPARISON_MAX[1];
  const a = randomInt(1, max);
  let b = randomInt(1, max);
  while (b === a) b = randomInt(1, max);
  const answer = a > b ? '>' : '<';
  return { type: 'comparaison', a, b, answer, prompt: `${a} ___ ${b}`, options: ['>', '<'] };
}

export function generateDivision(level = 1) {
  const tables = MULTIPLICATION_TABLES_BY_LEVEL[level] ?? MULTIPLICATION_TABLES_BY_LEVEL[1];
  const table = tables[randomInt(0, tables.length - 1)];
  const factor = randomInt(1, 10);
  const dividend = table * factor;
  return { type: 'division', a: dividend, b: table, answer: factor, prompt: `${dividend} ÷ ${table}` };
}

const FRACTION_DENOMINATORS_BY_LEVEL = {
  1: [3, 4],
  2: [3, 4, 6],
  3: [3, 4, 6, 8, 10],
};

export function generateFraction(level = 1) {
  const denominators = FRACTION_DENOMINATORS_BY_LEVEL[level] ?? FRACTION_DENOMINATORS_BY_LEVEL[1];
  const denominator = denominators[randomInt(0, denominators.length - 1)];
  let numeratorA = randomInt(1, denominator - 1);
  let numeratorB = randomInt(1, denominator - 1);
  while (numeratorB === numeratorA) numeratorB = randomInt(1, denominator - 1);
  const answer = numeratorA > numeratorB ? '>' : '<';
  return {
    type: 'fraction',
    a: { numerator: numeratorA, denominator },
    b: { numerator: numeratorB, denominator },
    answer,
    prompt: `${numeratorA}/${denominator} ___ ${numeratorB}/${denominator}`,
    options: ['>', '<'],
  };
}

const GEOMETRY_SHAPES_BY_LEVEL = {
  1: ['triangle', 'carre', 'cercle'],
  2: ['triangle', 'carre', 'cercle', 'rectangle', 'losange'],
  3: ['triangle', 'carre', 'cercle', 'rectangle', 'losange', 'pentagone', 'hexagone'],
};

export function generateGeometry(level = 1) {
  const shapes = GEOMETRY_SHAPES_BY_LEVEL[level] ?? GEOMETRY_SHAPES_BY_LEVEL[1];
  const shape = shapes[randomInt(0, shapes.length - 1)];
  return { type: 'geometrie', shape, answer: shapeSides(shape), prompt: 'Combien de côtés a cette forme ?' };
}

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
  division: generateDivision,
  fraction: generateFraction,
  geometrie: generateGeometry,
};

const FOCUS_RATIO = 0.7;

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS, focusType = null) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie'];
  const hasFocus = focusType && types.includes(focusType);
  const focusCount = hasFocus ? Math.round(count * FOCUS_RATIO) : 0;
  const otherTypes = hasFocus ? types.filter((t) => t !== focusType) : types;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = i < focusCount ? focusType : otherTypes[(i - focusCount) % otherTypes.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
