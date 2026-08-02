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
  const a = randomInt(10, 500);
  const b = randomInt(10, 499);
  return { type: 'addition', a, b, answer: a + b, prompt: `${a} + ${b}` };
}

export function generateSubtraction() {
  const a = randomInt(50, 999);
  const b = randomInt(10, a - 1);
  return { type: 'soustraction', a, b, answer: a - b, prompt: `${a} - ${b}` };
}

export function generateMultiplication() {
  const table = randomInt(2, 5);
  const factor = randomInt(1, 10);
  return { type: 'multiplication', a: table, b: factor, answer: table * factor, prompt: `${table} x ${factor}` };
}

export function generateComparison() {
  const a = randomInt(1, 999);
  let b = randomInt(1, 999);
  while (b === a) b = randomInt(1, 999);
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
