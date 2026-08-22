const CORE_BREAKDOWN_TYPES = [
  'addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction',
  'geometrie', 'monnaie', 'longueur', 'temps', 'probleme', 'accord-pluriel',
];

export function createSession(questions, subject = null) {
  const breakdownTypes = [...new Set([...CORE_BREAKDOWN_TYPES, ...questions.map((question) => question.type)])];
  return {
    questions,
    subject,
    index: 0,
    correctCount: 0,
    incorrectQuestions: [],
    breakdown: Object.fromEntries(breakdownTypes.map((type) => [type, { correct: 0, total: 0 }])),
    startedAt: Date.now(),
  };
}

export function currentQuestion(session) {
  return session.questions[session.index];
}

export function isSessionComplete(session) {
  return session.index >= session.questions.length;
}

export function recordAnswer(session, question, isCorrect, submittedAnswer = null) {
  const breakdown = session.breakdown[question.type] ?? (session.breakdown[question.type] = { correct: 0, total: 0 });
  breakdown.total += 1;
  if (isCorrect) {
    breakdown.correct += 1;
    session.correctCount += 1;
  } else {
    session.incorrectQuestions.push({ ...question, submittedAnswer });
  }
  return isCorrect;
}

export function submitAnswer(session, answer) {
  if (isSessionComplete(session)) {
    throw new Error('Cannot submit answer: session is complete');
  }
  const question = currentQuestion(session);
  const isCorrect = answersMatch(answer, question.answer);
  recordAnswer(session, question, isCorrect, answer);
  session.index += 1;
  return isCorrect;
}

export function normalizeTextAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .replaceAll('’', "'")
    .replace(/^(?:(?:de\s+)?l'\s*|d'\s*|de\s+la\s+|les\s+|des\s+|une\s+|un\s+|le\s+|la\s+|du\s+|de\s+)/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function answersMatch(submitted, expected) {
  if (typeof expected === 'number') return Number(submitted) === expected;
  return normalizeTextAnswer(submitted) === normalizeTextAnswer(expected);
}

export function finishSession(session) {
  const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
  return {
    date: new Date().toISOString().slice(0, 10),
    questionsTotal: session.questions.length,
    correctCount: session.correctCount,
    durationSeconds,
    breakdown: session.breakdown,
    incorrectQuestions: session.incorrectQuestions,
    subject: session.subject,
  };
}
