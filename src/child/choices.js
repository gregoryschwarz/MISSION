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

export function generateChoices(question) {
  if (question.type === 'comparaison') {
    return ['>', '<'];
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
