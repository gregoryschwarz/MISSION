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
    answeredQuestions: [],
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
  session.answeredQuestions.push({ ...question, submittedAnswer, isCorrect });
  return isCorrect;
}

function scheduleAdaptiveRetry(session, question) {
  if (question._adaptiveRetry) return;
  const remainingQuestions = session.questions.length - session.index - 1;
  if (remainingQuestions < 2) return;
  const retryIndex = session.index + 3;
  session.questions.splice(retryIndex, 0, { ...question, _adaptiveRetry: true });
}

export function submitAnswer(session, answer) {
  if (isSessionComplete(session)) {
    throw new Error('Cannot submit answer: session is complete');
  }
  const question = currentQuestion(session);
  const isCorrect = answersMatch(answer, question.answer);
  recordAnswer(session, question, isCorrect, answer);
  if (!isCorrect) scheduleAdaptiveRetry(session, question);
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
  const normalizedSubmitted = normalizeTextAnswer(submitted);
  const normalizedExpected = normalizeTextAnswer(expected);
  if (normalizedSubmitted === normalizedExpected) return true;
  if (normalizedExpected.length < 5 || normalizedSubmitted.length < 5) return false;
  const tolerance = normalizedExpected.length >= 9 ? 2 : 1;
  return editDistance(normalizedSubmitted, normalizedExpected) <= tolerance;
}

function editDistance(left, right) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }
  return matrix[left.length][right.length];
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
    answeredQuestions: session.answeredQuestions,
    subject: session.subject,
  };
}
