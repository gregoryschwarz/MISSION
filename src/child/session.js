export function createSession(questions) {
  return {
    questions,
    index: 0,
    correctCount: 0,
    breakdown: {
      addition: { correct: 0, total: 0 },
      soustraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      comparaison: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      fraction: { correct: 0, total: 0 },
      geometrie: { correct: 0, total: 0 },
    },
    startedAt: Date.now(),
  };
}

export function currentQuestion(session) {
  return session.questions[session.index];
}

export function isSessionComplete(session) {
  return session.index >= session.questions.length;
}

export function recordAnswer(session, question, isCorrect) {
  const breakdown = session.breakdown[question.type];
  breakdown.total += 1;
  if (isCorrect) {
    breakdown.correct += 1;
    session.correctCount += 1;
  }
  return isCorrect;
}

export function submitAnswer(session, answer) {
  if (isSessionComplete(session)) {
    throw new Error('Cannot submit answer: session is complete');
  }
  const question = currentQuestion(session);
  const isCorrect = answer === question.answer;
  recordAnswer(session, question, isCorrect);
  session.index += 1;
  return isCorrect;
}

export function finishSession(session) {
  const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
  return {
    date: new Date().toISOString().slice(0, 10),
    questionsTotal: session.questions.length,
    correctCount: session.correctCount,
    durationSeconds,
    breakdown: session.breakdown,
  };
}
