import { seasonForDate } from './seasons.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const VALID_TEXT_SIZES = ['normal', 'large', 'extra-large'];

function isoAfter(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function adaptiveMissionPlan(profile = {}) {
  const stats = profile.learningStats ?? {};
  const errorsByType = (profile.mistakeNotebook ?? []).reduce((totals, entry) => ({
    ...totals,
    [entry.type]: (totals[entry.type] ?? 0) + (entry.errorCount ?? 1),
  }), {});
  const types = [...new Set([...Object.keys(stats), ...Object.keys(errorsByType)])];
  const targetType = types.sort((left, right) => {
    const leftStats = stats[left] ?? {};
    const rightStats = stats[right] ?? {};
    const leftScore = (leftStats.total ? leftStats.correct / leftStats.total : 1) - (errorsByType[left] ?? 0) * 0.05;
    const rightScore = (rightStats.total ? rightStats.correct / rightStats.total : 1) - (errorsByType[right] ?? 0) * 0.05;
    return leftScore - rightScore;
  })[0] ?? profile.focusType ?? 'addition';
  const baseDifficulty = profile.difficultyLevels?.[targetType] ?? 1;
  const repeatedErrors = errorsByType[targetType] ?? 0;
  return {
    targetType,
    difficulty: Math.max(1, baseDifficulty - (repeatedErrors >= 3 ? 1 : 0)),
    reviewShare: repeatedErrors >= 3 ? 0.4 : repeatedErrors ? 0.25 : 0.15,
    reason: repeatedErrors ? `${repeatedErrors} erreur${repeatedErrors > 1 ? 's' : ''} à consolider` : 'Progression équilibrée',
  };
}

export function spacedReviewDates(completedDate) {
  return [1, 3, 7, 14].map((days) => isoAfter(completedDate, days));
}

export function correctionCoach(question = {}, submittedAnswer) {
  const retry = { ...question };
  let steps = [
    `Je repère ce que la question demande : ${question.prompt ?? 'la réponse attendue'}.`,
    'Je cherche l’indice ou la règle qui permet de répondre.',
    `Je vérifie avec la solution : ${question.answer}.`,
  ];
  if (question.type === 'addition' && Number.isFinite(question.a) && Number.isFinite(question.b)) {
    steps = [
      `Je décompose ${question.b} en dizaines et unités.`,
      `J’ajoute d’abord les dizaines à ${question.a}, puis les unités.`,
      `${question.a} + ${question.b} = ${question.answer}.`,
    ];
    retry.a = question.a + 1;
    retry.answer = retry.a + question.b;
    retry.prompt = `${retry.a} + ${question.b} ?`;
  }
  return {
    title: 'Reprenons ensemble, étape par étape',
    submittedAnswer,
    steps,
    retry,
  };
}

export function normalizeFamilyLearningPlan(plan = {}) {
  const dailyMinutes = Math.min(45, Math.max(5, Math.round(Number(plan.dailyMinutes) || 15)));
  const schoolDays = [...new Set(plan.schoolDays ?? VALID_DAYS.slice(0, 5))].filter((day) => VALID_DAYS.includes(day));
  const preferredSubjects = [...new Set(plan.preferredSubjects ?? [])].filter(Boolean).slice(0, 6);
  return { dailyMinutes, schoolDays, preferredSubjects };
}

export function toggleWishlistItem(existing = [], itemId) {
  if (!itemId) return [...existing];
  return existing.includes(itemId) ? existing.filter((id) => id !== itemId) : [...existing, itemId];
}

const SEASONAL_EVENTS = {
  winter: { emoji: '❄️', title: 'Festival des flocons', effect: 'snow' },
  spring: { emoji: '🌸', title: 'Jardin des découvertes', effect: 'petals' },
  summer: { emoji: '☀️', title: 'Aventure ensoleillée', effect: 'bubbles' },
  autumn: { emoji: '🍂', title: 'Forêt des savoirs', effect: 'leaves' },
};

export function seasonalEventState(profile = {}, date = new Date()) {
  const id = seasonForDate(date);
  const progress = Math.max(0, profile.seasonalMissionCounts?.[id] ?? 0);
  const target = 8;
  return { id, ...SEASONAL_EVENTS[id], progress, target, completed: progress >= target, rewardCoins: 25 };
}

export function companionMood(profile = {}, today = new Date().toISOString().slice(0, 10)) {
  const todayCount = profile.dailyMissionCountDate === today ? profile.dailyMissionCount ?? 0 : 0;
  if (todayCount >= 3) return { id: 'proud', emoji: '🥳', label: 'Très fier', message: 'Quelle belle journée ! On a beaucoup progressé ensemble.' };
  if ((profile.learningRecaps ?? []).some((entry) => entry.dueDate <= today)) return { id: 'helpful', emoji: '🧠', label: 'Prêt à aider', message: 'Une petite révision nous attend, je reste avec toi.' };
  return { id: 'ready', emoji: '✨', label: 'Motivé', message: (profile.streakDays ?? 0) > 1 ? `On continue notre série de ${profile.streakDays} jours !` : 'Choisissons une mission pour commencer !' };
}

function mondayIso(referenceDate) {
  const date = new Date(referenceDate);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function weeklyParentReport(sessions = [], profile = {}, referenceDate = new Date()) {
  const start = mondayIso(referenceDate);
  const end = new Date(`${start}T00:00:00Z`).getTime() + 7 * DAY_MS;
  const weekly = sessions.filter((session) => {
    const time = new Date(`${session.date}T00:00:00Z`).getTime();
    return time >= new Date(`${start}T00:00:00Z`).getTime() && time < end;
  });
  const correct = weekly.reduce((sum, session) => sum + (session.correctCount ?? 0), 0);
  const total = weekly.reduce((sum, session) => sum + (session.questionsTotal ?? 0), 0);
  const minutes = Math.round(weekly.reduce((sum, session) => sum + (session.durationSeconds ?? 0), 0) / 60);
  const notions = {};
  weekly.forEach((session) => Object.entries(session.breakdown ?? {}).forEach(([type, stats]) => {
    const current = notions[type] ?? { correct: 0, total: 0 };
    notions[type] = { correct: current.correct + (stats.correct ?? 0), total: current.total + (stats.total ?? 0) };
  }));
  const priorityType = Object.entries(notions).sort(([, left], [, right]) => (left.correct / Math.max(1, left.total)) - (right.correct / Math.max(1, right.total)))[0]?.[0] ?? profile.focusType ?? null;
  return {
    missions: weekly.length,
    correct,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    minutes,
    priorityType,
    learnedRules: (profile.learnedLessons ?? []).filter((lesson) => lesson.lastLearnedDate >= start).length,
  };
}

export function offlineSyncState(pendingCount = 0, online = true) {
  const pending = Math.max(0, Number(pendingCount) || 0);
  if (!online) return { id: 'offline', pending, label: `Hors connexion · ${pending} mission${pending > 1 ? 's' : ''} à synchroniser` };
  if (pending) return { id: 'syncing', pending, label: `Synchronisation de ${pending} mission${pending > 1 ? 's' : ''}…` };
  return { id: 'synced', pending: 0, label: 'Tout est synchronisé' };
}

export function normalizeAccessibilityPreferences(preferences = {}) {
  return {
    textSize: VALID_TEXT_SIZES.includes(preferences.textSize) ? preferences.textSize : 'normal',
    dyslexiaMode: !!preferences.dyslexiaMode,
    reducedMotion: !!preferences.reducedMotion,
    readInstructions: !!preferences.readInstructions,
  };
}
