function visualSignature(question) {
  if (question.shape) return question.shape;
  if (Array.isArray(question.items)) return question.items.join('|');
  if (question.hour12 !== undefined) return `${question.hour12}:${question.minute ?? 0}`;
  return '';
}

export function questionIdentity(question) {
  if (question.sourceId) return `source:${question.sourceId}`;
  return JSON.stringify([
    question.type,
    question.prompt,
    visualSignature(question),
    question.given ?? null,
  ]);
}

export function generateUniqueQuestions(count, createQuestion, maxAttemptsPerQuestion = 80) {
  const questions = [];
  const seen = new Set();
  while (questions.length < count) {
    let candidate = null;
    for (let attempt = 0; attempt < maxAttemptsPerQuestion; attempt += 1) {
      candidate = createQuestion(questions.length);
      const identity = questionIdentity(candidate);
      if (!seen.has(identity)) {
        seen.add(identity);
        questions.push(candidate);
        candidate = null;
        break;
      }
    }
    if (candidate) questions.push(candidate);
  }
  return questions;
}
