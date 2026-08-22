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
  const { submittedAnswer, ...clean } = question;
  return clean;
}

export function updateMistakeNotebook(existing = [], incorrectQuestions = [], date, maxEntries = 40) {
  const byKey = new Map(existing.map((entry) => [notebookKey(entry), { ...entry }]));
  incorrectQuestions.forEach((question) => {
    const clean = storableQuestion(question);
    const key = notebookKey(clean);
    const previous = byKey.get(key);
    byKey.set(key, {
      ...clean,
      errorCount: (previous?.errorCount ?? 0) + 1,
      firstErrorDate: previous?.firstErrorDate ?? date,
      lastErrorDate: date,
    });
  });
  return [...byKey.values()]
    .sort((a, b) => (b.errorCount - a.errorCount) || String(b.lastErrorDate).localeCompare(String(a.lastErrorDate)))
    .slice(0, maxEntries);
}

export function reviewQuestionsFromNotebook(notebook = [], count = 10) {
  return notebook.slice(0, count).map(({ errorCount, firstErrorDate, lastErrorDate, ...question }) => ({ ...question }));
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
