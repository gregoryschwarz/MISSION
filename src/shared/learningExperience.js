import { DEFAULT_ENABLED_SUBJECT_IDS, subjectForId } from './subjects.js';

export const SCHOOL_LEVELS = [
  { id: 'CP', label: 'CP', maxDifficulty: 1 },
  { id: 'CE1', label: 'CE1', maxDifficulty: 1 },
  { id: 'CE2', label: 'CE2', maxDifficulty: 2 },
  { id: 'CM1', label: 'CM1', maxDifficulty: 3 },
  { id: 'CM2', label: 'CM2', maxDifficulty: 3 },
];

export function normalizeSchoolLevel(level) {
  return SCHOOL_LEVELS.some((item) => item.id === level) ? level : 'CE2';
}

export function difficultyForSchoolLevel(adaptiveDifficulty = 1, schoolLevel = 'CE2') {
  const entry = SCHOOL_LEVELS.find((item) => item.id === normalizeSchoolLevel(schoolLevel));
  return Math.min(entry.maxDifficulty, Math.max(1, Number(adaptiveDifficulty) || 1));
}

function notebookKey(question) {
  return `${question.type}::${question.prompt}`;
}

function storableQuestion(question) {
  const { submittedAnswer, isCorrect, _adaptiveRetry, ...clean } = question;
  return clean;
}

function dateAfter(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

export function learningStatusForEntry(entry = {}) {
  const stage = entry.retentionStage ?? 0;
  if (stage >= 2) return { id: 'acquis', label: 'Acquis', emoji: '✅' };
  if (stage === 1) return { id: 'en-progres', label: 'En progrès', emoji: '🌱' };
  return { id: 'a-revoir', label: 'À revoir', emoji: '🔁' };
}

export function updateLearningNotebook(existing = [], answeredQuestions = [], date, maxEntries = 40) {
  const byKey = new Map(existing.map((entry) => [notebookKey(entry), { ...entry }]));
  answeredQuestions.forEach((answered) => {
    const clean = storableQuestion(answered);
    const key = notebookKey(clean);
    const previous = byKey.get(key);
    if (answered.isCorrect && !previous) return;
    if (!answered.isCorrect) {
      byKey.set(key, {
        ...previous,
        ...clean,
        errorCount: (previous?.errorCount ?? 0) + 1,
        correctReviewCount: previous?.correctReviewCount ?? 0,
        retentionStage: 0,
        firstErrorDate: previous?.firstErrorDate ?? date,
        lastErrorDate: date,
        lastReviewDate: date,
        nextReviewDate: dateAfter(date, REVIEW_INTERVALS[0]),
        lastResult: 'incorrect',
      });
      return;
    }
    if (previous.lastResult === 'correct' && previous.lastReviewDate === date) return;
    const retentionStage = Math.min(4, (previous.retentionStage ?? 0) + 1);
    byKey.set(key, {
      ...previous,
      ...clean,
      correctReviewCount: (previous.correctReviewCount ?? 0) + 1,
      retentionStage,
      lastReviewDate: date,
      nextReviewDate: dateAfter(date, REVIEW_INTERVALS[retentionStage]),
      lastResult: 'correct',
    });
  });
  return [...byKey.values()]
    .sort((a, b) => (b.errorCount - a.errorCount) || String(a.nextReviewDate).localeCompare(String(b.nextReviewDate)))
    .slice(0, maxEntries);
}

export function updateMistakeNotebook(existing = [], incorrectQuestions = [], date, maxEntries = 40) {
  return updateLearningNotebook(
    existing,
    incorrectQuestions.map((question) => ({ ...question, isCorrect: false })),
    date,
    maxEntries
  );
}

export function reviewQuestionsFromNotebook(notebook = [], count = 10, today = new Date().toISOString().slice(0, 10)) {
  return notebook
    .filter((entry) => !entry.nextReviewDate || entry.nextReviewDate <= today)
    .sort((a, b) => (b.errorCount - a.errorCount) || String(a.nextReviewDate).localeCompare(String(b.nextReviewDate)))
    .slice(0, count)
    .map(({ errorCount, correctReviewCount, retentionStage, firstErrorDate, lastErrorDate, lastReviewDate, nextReviewDate, lastResult, ...question }) => ({ ...question }));
}

export function personalizedLearningPlan(notebook = [], count = 10, today = new Date().toISOString().slice(0, 10)) {
  const reviewQuestions = reviewQuestionsFromNotebook(notebook, Math.min(4, count), today);
  const priorityTypes = [...new Set([...notebook]
    .sort((a, b) => (b.errorCount ?? 0) - (a.errorCount ?? 0))
    .map((entry) => entry.type)
    .filter(Boolean))];
  return { reviewQuestions, priorityTypes };
}

export function notionLearningStatuses(sessions = [], minAttempts = 3) {
  const totals = {};
  sessions.forEach((session) => Object.entries(session.breakdown ?? {}).forEach(([type, stats]) => {
    if (!stats.total) return;
    if (!totals[type]) totals[type] = { correct: 0, total: 0, successfulDays: new Set() };
    totals[type].correct += stats.correct ?? 0;
    totals[type].total += stats.total;
    (stats.successDates ?? []).forEach((date) => totals[type].successfulDays.add(date));
    if ((stats.correct ?? 0) > 0 && session.date) totals[type].successfulDays.add(session.date);
  }));
  return Object.entries(totals)
    .filter(([, stats]) => stats.total >= minAttempts)
    .map(([type, stats]) => {
      const percent = Math.round((stats.correct / stats.total) * 100);
      const successfulDayCount = stats.successfulDays.size;
      const status = stats.total >= 5 && percent >= 80 && successfulDayCount >= 2 ? 'acquis' : percent < 60 ? 'a-revoir' : 'en-progres';
      return { type, correct: stats.correct, total: stats.total, percent, successfulDayCount, status };
    });
}

export function retentionSummary(sessions = [], notebook = [], today = new Date().toISOString().slice(0, 10)) {
  const reviewSessions = sessions.filter((session) => ['mistake-review', 'personalized', 'learning'].includes(session.missionKind));
  const reviewedQuestions = reviewSessions.reduce((sum, session) => sum + (session.questionsTotal ?? 0), 0);
  const correctReviews = reviewSessions.reduce((sum, session) => sum + (session.correctCount ?? 0), 0);
  const statuses = notebook.map(learningStatusForEntry);
  return {
    reviewMissions: reviewSessions.length,
    reviewedQuestions,
    correctReviews,
    reviewPercent: reviewedQuestions ? Math.round((correctReviews / reviewedQuestions) * 100) : 0,
    retainedCount: statuses.filter((status) => status.id === 'acquis').length,
    progressingCount: statuses.filter((status) => status.id === 'en-progres').length,
    dueCount: notebook.filter((entry) => !entry.nextReviewDate || entry.nextReviewDate <= today).length,
  };
}

export const WEEKLY_LEARNING_THEMES = [
  { id: 'space', emoji: '🚀', label: 'Mission dans l’espace', description: 'Explore les planètes avec les sciences et la logique.', subjectIds: ['sciences', 'logique'] },
  { id: 'world-tour', emoji: '🌍', label: 'Tour du monde', description: 'Voyage avec l’anglais, la culture et la géographie.', subjectIds: ['anglais', 'culture-generale', 'histoire-geographie'] },
  { id: 'creative-studio', emoji: '🎨', label: 'Studio des artistes', description: 'Mélange arts, musique et mots bien écrits.', subjectIds: ['arts', 'orthographe'] },
  { id: 'time-travel', emoji: '🏛️', label: 'Voyage dans le temps', description: 'Résous des énigmes au fil de l’Histoire.', subjectIds: ['histoire-geographie', 'logique'] },
];

function mondayUtc(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

export function weeklyLearningTheme(isoDate = new Date().toISOString().slice(0, 10)) {
  const weekIndex = Math.floor(mondayUtc(isoDate).getTime() / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_LEARNING_THEMES[Math.abs(weekIndex) % WEEKLY_LEARNING_THEMES.length];
}

export function surpriseSubjectIds(enabledSubjectIds = DEFAULT_ENABLED_SUBJECT_IDS, count = 3, random = Math.random) {
  const valid = [...new Set(enabledSubjectIds)].filter((id) => subjectForId(id));
  for (let index = valid.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [valid[index], valid[target]] = [valid[target], valid[index]];
  }
  return valid.slice(0, Math.min(count, valid.length));
}

export const STORY_CHAPTERS = [
  { id: 'forest', emoji: '🌲', title: 'La forêt des questions', description: 'Retrouve la première clé du savoir.' },
  { id: 'library', emoji: '📚', title: 'La bibliothèque secrète', description: 'Réveille les livres endormis.' },
  { id: 'observatory', emoji: '🔭', title: 'L’observatoire des étoiles', description: 'Répare la carte du ciel.' },
  { id: 'castle', emoji: '🏰', title: 'Le château des connaissances', description: 'Ouvre la salle du grand trésor.' },
];

export function storyProgressAfterMission(profile = {}) {
  return Math.max(0, profile.storyProgress ?? 0) + 1;
}

export function storyChapter(progress = 0) {
  return STORY_CHAPTERS[Math.floor(Math.max(0, progress) / 5) % STORY_CHAPTERS.length];
}

export function subjectMissionCountsAfter(counts = {}, subjectId) {
  if (!subjectForId(subjectId)) return { ...counts };
  return { ...counts, [subjectId]: (counts[subjectId] ?? 0) + 1 };
}

export function newlyEarnedSubjectBadges(counts = {}, existingBadges = []) {
  return DEFAULT_ENABLED_SUBJECT_IDS
    .filter((subjectId) => (counts[subjectId] ?? 0) > 0 && (counts[subjectId] ?? 0) % 5 === 0)
    .map((subjectId) => `subject-${subjectId}`)
    .filter((badgeId) => !existingBadges.includes(badgeId) || (counts[badgeId.replace('subject-', '')] ?? 0) > 5);
}

export function subjectSummary(sessions = [], subjectId) {
  const matching = sessions.filter((session) => session.subject === subjectId);
  const correct = matching.reduce((total, session) => total + (session.correctCount ?? 0), 0);
  const total = matching.reduce((sum, session) => sum + (session.questionsTotal ?? 0), 0);
  const durationSeconds = matching.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0);
  return {
    missions: matching.length,
    correct,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    durationMinutes: Math.round(durationSeconds / 60),
  };
}
