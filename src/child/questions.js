import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function noBorrowSubtrahend(a) {
  const digits = String(a).split('').map(Number);
  const bDigits = digits.map((d) => randomInt(0, d));
  if (bDigits.every((d) => d === 0)) {
    const bumpableIndex = digits.findIndex((d) => d > 0);
    if (bumpableIndex !== -1) {
      bDigits[bumpableIndex] = randomInt(1, digits[bumpableIndex]);
    }
  }
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
  const a = randomInt(10, maxValue - 1);
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

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
};

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison'];
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
