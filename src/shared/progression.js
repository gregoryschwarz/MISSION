import { DEFAULT_DIFFICULTY_LEVELS } from './difficulty.js';

const XP_PER_CORRECT = 10;
const XP_PER_LEVEL = 100;
const MASTERY_LEVEL = 3;
const OPERATION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps'];

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

export function updateStreak(previousStreak, lastSessionDate, today) {
  if (!lastSessionDate) return 1;
  const prev = new Date(lastSessionDate);
  const current = new Date(today);
  const diffDays = Math.round((current - prev) / 86400000);
  if (diffDays === 0) return previousStreak;
  if (diffDays === 1) return previousStreak + 1;
  return 1;
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

  return {
    xp,
    avatarLevel,
    streakDays,
    badges,
    perfectMissionsCount,
    lastSessionDate: today,
    leveledUp: avatarLevel > profile.avatarLevel,
    newBadges,
  };
}
