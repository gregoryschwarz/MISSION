const XP_PER_CORRECT = 10;
const XP_PER_LEVEL = 100;

const STREAK_BADGES = [
  { days: 3, id: 'streak-3' },
  { days: 7, id: 'streak-7' },
  { days: 30, id: 'streak-30' },
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

export function applyProgression(profile, sessionSummary) {
  const today = sessionSummary.date;
  const gainedXp = xpForSession(sessionSummary.correctCount);
  const xp = profile.xp + gainedXp;
  const avatarLevel = levelForXp(xp);
  const streakDays = updateStreak(profile.streakDays, profile.lastSessionDate, today);
  const newBadges = newlyEarnedBadges(streakDays, profile.badges);
  const badges = [...profile.badges, ...newBadges];
  return {
    xp,
    avatarLevel,
    streakDays,
    badges,
    lastSessionDate: today,
    leveledUp: avatarLevel > profile.avatarLevel,
    newBadges,
  };
}
