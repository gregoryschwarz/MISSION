import { randomInt, shuffle } from './random.js';

export function generateChoices(question) {
  if (Array.isArray(question.options)) {
    return question.options;
  }
  const correct = question.answer;
  const distractors = new Set();
  while (distractors.size < 2) {
    const magnitude = randomInt(1, 5);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const candidate = correct + magnitude * sign;
    if (candidate >= 0 && candidate !== correct && !distractors.has(candidate)) {
      distractors.add(candidate);
    }
  }
  return shuffle([correct, ...distractors]);
}
