import { DEFAULT_DIFFICULTY_LEVELS } from './difficulty.js';

const XP_PER_CORRECT = 10;
const XP_PER_LEVEL = 100;
const COINS_PER_CORRECT = 1;
const PERFECT_MISSION_COIN_BONUS = 5;
const MASTERY_LEVEL = 3;
export const DAILY_CHALLENGE_TARGET = 5;
const DAILY_CHALLENGE_XP_BONUS = 20;
const DAILY_CHALLENGE_COIN_BONUS = 10;
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme', 'accord-pluriel'];

const STREAK_BADGES = [
  { days: 3, id: 'streak-3' },
  { days: 7, id: 'streak-7' },
  { days: 30, id: 'streak-30' },
];

const PERFECT_MISSION_BADGES = [
  { count: 1, id: 'perfect-1' },
  { count: 10, id: 'perfect-10' },
  { count: 50, id: 'perfect-50' },
];

export function xpForSession(correctCount) {
  return correctCount * XP_PER_CORRECT;
}

export function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// Progression (0-100) de l'XP à l'intérieur du niveau courant, pour la barre d'XP.
export function xpProgressForLevel(xp) {
  return { current: xp % XP_PER_LEVEL, target: XP_PER_LEVEL };
}

// Les pièces sont une monnaie distincte de l'XP : elle se gagne en jouant
// et se dépense (personnages, décors, récompenses réelles) — voir spendCoins.
export function coinsForSession(correctCount, isPerfect) {
  return correctCount * COINS_PER_CORRECT + (isPerfect ? PERFECT_MISSION_COIN_BONUS : 0);
}

// Détail affichable à la fin d'une mission : l'enfant comprend précisément
// d'où viennent ses pièces au lieu de ne voir qu'un total abstrait.
export function coinRewardBreakdown(correctCount, isPerfect, completedDailyChallenge = false) {
  const answerCoins = correctCount * COINS_PER_CORRECT;
  const perfectBonus = isPerfect ? PERFECT_MISSION_COIN_BONUS : 0;
  const dailyBonus = completedDailyChallenge ? DAILY_CHALLENGE_COIN_BONUS : 0;
  return {
    answerCoins,
    perfectBonus,
    dailyBonus,
    total: answerCoins + perfectBonus + dailyBonus,
  };
}

// Retire `amount` pièces du profil si le solde est suffisant.
// Retourne le nouveau solde, ou null si le solde est insuffisant (rien n'est débité).
export function spendCoins(currentCoins, amount) {
  if (amount < 0 || currentCoins < amount) return null;
  return currentCoins - amount;
}

// Recrédite `amount` pièces (ex. demande de récompense refusée par le parent).
export function refundCoins(currentCoins, amount) {
  if (amount < 0) return currentCoins;
  return currentCoins + amount;
}

export function updateStreak(previousStreak, lastSessionDate, today) {
  if (!lastSessionDate) return 1;
  const prev = new Date(lastSessionDate);
  const current = new Date(today);
  const diffDays = Math.round((current - prev) / 86400000);
  if (diffDays === 0) return previousStreak;
  if (diffDays === 1) return previousStreak + 1;
  return 1;
}

// État de la série pour la bannière intelligente de l'accueil :
// 'none'        → jamais joué
// 'played-today'→ déjà joué aujourd'hui, série à l'abri (menthe)
// 'at-risk'     → joué hier mais pas encore aujourd'hui, série en jeu (jaune)
// 'broken'      → plus d'un jour d'écart, la série sera remise à 1 à la prochaine partie (corail)
export function streakStatus(lastSessionDate, today) {
  if (!lastSessionDate) return 'none';
  const prev = new Date(lastSessionDate);
  const current = new Date(today);
  const diffDays = Math.round((current - prev) / 86400000);
  if (diffDays === 0) return 'played-today';
  if (diffDays === 1) return 'at-risk';
  return 'broken';
}

// Défi quotidien : réussir DAILY_CHALLENGE_TARGET bonnes réponses dans la journée.
// Le compteur repart de zéro à chaque nouveau jour ; un bonus XP + pièces est
// accordé une seule fois, la première fois que le défi est atteint ce jour-là.
export function applyDailyChallenge(profile, sessionSummary) {
  const today = sessionSummary.date;
  const sameDay = profile.dailyChallengeDate === today;
  const previousProgress = sameDay ? profile.dailyChallengeProgress ?? 0 : 0;
  const wasCompleted = sameDay && !!profile.dailyChallengeCompleted;
  const progress = Math.min(previousProgress + sessionSummary.correctCount, DAILY_CHALLENGE_TARGET);
  const completed = progress >= DAILY_CHALLENGE_TARGET;
  const justCompleted = completed && !wasCompleted;
  return {
    dailyChallengeDate: today,
    dailyChallengeProgress: progress,
    dailyChallengeCompleted: completed,
    justCompletedDailyChallenge: justCompleted,
    bonusXp: justCompleted ? DAILY_CHALLENGE_XP_BONUS : 0,
    bonusCoins: justCompleted ? DAILY_CHALLENGE_COIN_BONUS : 0,
  };
}

// Début (lundi) de la semaine ISO contenant `dateStr` ("YYYY-MM-DD"), au format
// "YYYY-MM-DD". Utilisé pour réinitialiser l'objectif hebdomadaire chaque lundi.
export function weekStartKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

// Objectif hebdomadaire fixé par le parent (nombre de missions à réussir cette
// semaine). La progression est un simple compteur de missions terminées,
// remis à zéro à chaque nouvelle semaine (lundi).
export function applyWeeklyGoal(profile, sessionSummary) {
  const weekStart = weekStartKey(sessionSummary.date);
  const sameWeek = profile.weeklyGoalWeekStart === weekStart;
  const previousProgress = sameWeek ? profile.weeklyGoalProgress ?? 0 : 0;
  const progress = previousProgress + 1;
  const target = profile.weeklyGoalTarget ?? 0;
  return {
    weeklyGoalWeekStart: weekStart,
    weeklyGoalProgress: progress,
    weeklyGoalTarget: target,
    weeklyGoalCompleted: target > 0 && progress >= target,
  };
}

export function newlyEarnedBadges(streakDays, existingBadges) {
  return STREAK_BADGES.filter(
    (b) => streakDays >= b.days && !existingBadges.includes(b.id)
  ).map((b) => b.id);
}

export function newlyMasteredTypes(previousLevels, nextLevels) {
  return OPERATION_TYPES.filter(
    (type) => nextLevels[type] === MASTERY_LEVEL && previousLevels[type] !== MASTERY_LEVEL
  );
}

export function newlyEarnedPerfectBadges(perfectMissionsCount, existingBadges) {
  return PERFECT_MISSION_BADGES.filter(
    (b) => perfectMissionsCount >= b.count && !existingBadges.includes(b.id)
  ).map((b) => b.id);
}

export function applyProgression(profile, sessionSummary, nextDifficultyLevels) {
  const today = sessionSummary.date;
  const gainedXp = xpForSession(sessionSummary.correctCount);
  const xp = profile.xp + gainedXp;
  const avatarLevel = levelForXp(xp);
  const streakDays = updateStreak(profile.streakDays, profile.lastSessionDate, today);
  const streakBadges = newlyEarnedBadges(streakDays, profile.badges);

  const previousDifficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const masteredTypes = newlyMasteredTypes(previousDifficultyLevels, nextDifficultyLevels ?? previousDifficultyLevels);
  const masteryBadges = masteredTypes.map((type) => `mastery-${type}`);

  const isPerfect = sessionSummary.correctCount === sessionSummary.questionsTotal;
  const perfectMissionsCount = (profile.perfectMissionsCount ?? 0) + (isPerfect ? 1 : 0);
  const badgesBeforePerfectCheck = [...profile.badges, ...streakBadges, ...masteryBadges];
  const perfectBadges = isPerfect
    ? newlyEarnedPerfectBadges(perfectMissionsCount, badgesBeforePerfectCheck)
    : [];

  const newBadges = [...streakBadges, ...masteryBadges, ...perfectBadges];
  const badges = [...profile.badges, ...newBadges];
  const badgeDates = { ...(profile.badgeDates ?? {}) };
  newBadges.forEach((id) => {
    badgeDates[id] = today;
  });
  const totalCorrectCount = (profile.totalCorrectCount ?? 0) + sessionSummary.correctCount;
  const gainedCoins = coinsForSession(sessionSummary.correctCount, isPerfect);
  const coins = (profile.coins ?? 0) + gainedCoins;

  return {
    xp,
    avatarLevel,
    streakDays,
    badges,
    badgeDates,
    perfectMissionsCount,
    totalCorrectCount,
    coins,
    gainedCoins,
    lastSessionDate: today,
    leveledUp: avatarLevel > profile.avatarLevel,
    newBadges,
  };
}
