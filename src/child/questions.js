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

export function generateAddition() {
  const a = randomInt(10, 79);
  const b = randomInt(1, 99 - a);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

export function generateSubtraction() {
  const aUnits = randomInt(0, 9);
  const aTens = randomInt(1, 9);
  const a = aTens * 10 + aUnits;
  const bUnits = randomInt(0, aUnits);
  const bTens = randomInt(0, aTens);
  const b = bTens * 10 + bUnits;
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

const MULTIPLICATION_TABLES = [2, 5, 10];

export function generateMultiplication() {
  const table = MULTIPLICATION_TABLES[randomInt(0, MULTIPLICATION_TABLES.length - 1)];
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

export function generateComparison() {
  const a = randomInt(1, 99);
  let b = randomInt(1, 99);
  while (b === a) b = randomInt(1, 99);
  const answer = a > b ? '>' : '<';
  return { type: 'comparaison', a, b, answer, prompt: `${a} ___ ${b}`, options: ['>', '<'] };
}

const GENERATORS = {
  addition: generateAddition,
  soustraction: generateSubtraction,
  multiplication: generateMultiplication,
  comparaison: generateComparison,
};

export function generateMission(count = 10) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison'];
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    questions.push(GENERATORS[type]());
  }
  return shuffle(questions);
}
