import { learningTypeEmoji } from './subjects.js';

export const BADGES = [
  { id: 'streak-3', category: 'streak', emoji: '🔥', label: 'Étincelle', description: 'Jouer 3 jours de suite', metric: 'streakDays', target: 3, repeatable: true, gradient: ['#ffd166', '#ff9f43'] },
  { id: 'streak-7', category: 'streak', emoji: '⭐', label: 'Étoile fidèle', description: 'Jouer 7 jours de suite', metric: 'streakDays', target: 7, repeatable: true, gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', category: 'streak', emoji: '👑', label: 'Légende du mois', description: 'Jouer 30 jours de suite', metric: 'streakDays', target: 30, repeatable: true, gradient: ['#ffd166', '#ff8fd6'] },
  { id: 'mastery-addition', category: 'maitrise', emoji: '➕', label: 'As de l’addition', description: 'Atteindre le niveau Avancé en addition', metric: 'mastery-addition', target: 3, gradient: ['#a8e6cf', '#55c59d'] },
  { id: 'mastery-soustraction', category: 'maitrise', emoji: '➖', label: 'As de la soustraction', description: 'Atteindre le niveau Avancé en soustraction', metric: 'mastery-soustraction', target: 3, gradient: ['#ffaaa5', '#ff7d75'] },
  { id: 'mastery-multiplication', category: 'maitrise', emoji: '✖️', label: 'As des multiplications', description: 'Atteindre le niveau Avancé en multiplication', metric: 'mastery-multiplication', target: 3, gradient: ['#a2d2ff', '#579ee8'] },
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Œil de lynx', description: 'Atteindre le niveau Avancé en comparaison', metric: 'mastery-comparaison', target: 3, gradient: ['#cdb4db', '#a978c2'] },
  { id: 'mastery-division', category: 'maitrise', emoji: '➗', label: 'As de la division', description: 'Atteindre le niveau Avancé en division', metric: 'mastery-division', target: 3, gradient: ['#ffe5a0', '#ffbd4a'] },
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Maître des fractions', description: 'Atteindre le niveau Avancé en fractions', metric: 'mastery-fraction', target: 3, gradient: ['#4ecdc4', '#1ea69e'] },
  { id: 'mastery-geometrie', category: 'maitrise', emoji: '📐', label: 'Architecte des formes', description: 'Atteindre le niveau Avancé en géométrie', metric: 'mastery-geometrie', target: 3, gradient: ['#90a4ae', '#607d8b'] },
  { id: 'mastery-monnaie', category: 'maitrise', emoji: '💶', label: 'Pro de la monnaie', description: 'Atteindre le niveau Avancé en monnaie', metric: 'mastery-monnaie', target: 3, gradient: ['#e6bd74', '#b08968'] },
  { id: 'mastery-longueur', category: 'maitrise', emoji: '📏', label: 'Expert des mesures', description: 'Atteindre le niveau Avancé en longueurs', metric: 'mastery-longueur', target: 3, gradient: ['#8c9eff', '#5c6bc0'] },
  { id: 'mastery-temps', category: 'maitrise', emoji: '🕐', label: 'Gardien du temps', description: 'Atteindre le niveau Avancé en heure', metric: 'mastery-temps', target: 3, gradient: ['#ff9b75', '#d84315'] },
  { id: 'mastery-probleme', category: 'maitrise', emoji: '🧩', label: 'Détective des problèmes', description: 'Atteindre le niveau Avancé en problèmes', metric: 'mastery-probleme', target: 3, gradient: ['#c786e5', '#6a1b9a'] },
  { id: 'mastery-accord-pluriel', category: 'maitrise', emoji: '🔤', label: 'Champion des mots', description: 'Atteindre le niveau Avancé en accord pluriel', metric: 'mastery-accord-pluriel', target: 3, gradient: ['#86d98b', '#2e7d32'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: 'Sans faute !', description: 'Réussir une mission parfaite', metric: 'perfectMissionsCount', target: 1, repeatable: true, gradient: ['#ffd166', '#f4a261'] },
  { id: 'perfect-10', category: 'parfait', emoji: '🌈', label: 'Perfection arc-en-ciel', description: 'Réussir 10 nouvelles missions parfaites', metric: 'perfectMissionsCount', target: 10, repeatable: true, gradient: ['#ff9a8b', '#ff6a88'] },
  { id: 'perfect-50', category: 'parfait', emoji: '💎', label: 'Diamant parfait', description: 'Réussir 50 nouvelles missions parfaites', metric: 'perfectMissionsCount', target: 50, repeatable: true, gradient: ['#84fab0', '#8fd3f4'] },
  { id: 'answers-50', category: 'progression', emoji: '🌱', label: 'Premières pousses', description: 'Donner 50 bonnes réponses', metric: 'totalCorrectCount', target: 50, gradient: ['#c7f9cc', '#80ed99'] },
  { id: 'answers-250', category: 'progression', emoji: '🚀', label: 'En plein décollage', description: 'Donner 250 bonnes réponses', metric: 'totalCorrectCount', target: 250, gradient: ['#90e0ef', '#48cae4'] },
  { id: 'answers-1000', category: 'progression', emoji: '🏆', label: 'Mille réussites', description: 'Donner 1 000 bonnes réponses', metric: 'totalCorrectCount', target: 1000, gradient: ['#ffe066', '#fca311'] },
  { id: 'level-5', category: 'progression', emoji: '🪄', label: 'Apprentie héroïne', description: 'Atteindre le niveau 5', metric: 'avatarLevel', target: 5, gradient: ['#e0aaff', '#c77dff'] },
  { id: 'level-10', category: 'progression', emoji: '🦸‍♀️', label: 'Super aventurière', description: 'Atteindre le niveau 10', metric: 'avatarLevel', target: 10, gradient: ['#ffafcc', '#ff5d8f'] },
  { id: 'level-20', category: 'progression', emoji: '🌟', label: 'Héroïne légendaire', description: 'Atteindre le niveau 20', metric: 'avatarLevel', target: 20, gradient: ['#ffd60a', '#ff7b00'] },
  { id: 'daily-1', category: 'challenge', emoji: '🎯', label: 'Défi relevé', description: 'Terminer un nouveau défi du jour', metric: 'dailyChallengeCompletions', target: 1, repeatable: true, gradient: ['#bde0fe', '#76c4f5'] },
  { id: 'daily-7', category: 'challenge', emoji: '⚡', label: 'Éclair quotidien', description: 'Terminer 7 nouveaux défis du jour', metric: 'dailyChallengeCompletions', target: 7, repeatable: true, gradient: ['#fff3b0', '#ffcc33'] },
  { id: 'daily-30', category: 'challenge', emoji: '☀️', label: 'Soleil des défis', description: 'Terminer 30 nouveaux défis du jour', metric: 'dailyChallengeCompletions', target: 30, repeatable: true, gradient: ['#ffd166', '#ff8c42'] },
  { id: 'weekly-1', category: 'challenge', emoji: '🎁', label: 'Grand objectif', description: 'Atteindre un nouvel objectif de la semaine', metric: 'weeklyGoalCompletions', target: 1, repeatable: true, gradient: ['#caffbf', '#70d6a2'] },
  { id: 'weekly-5', category: 'challenge', emoji: '🗺️', label: 'Capitaine de semaine', description: 'Atteindre 5 nouveaux objectifs de la semaine', metric: 'weeklyGoalCompletions', target: 5, repeatable: true, gradient: ['#a0c4ff', '#5e81f4'] },
  { id: 'weekly-10', category: 'challenge', emoji: '🏰', label: 'Reine des objectifs', description: 'Atteindre 10 nouveaux objectifs de la semaine', metric: 'weeklyGoalCompletions', target: 10, repeatable: true, gradient: ['#ffc6ff', '#b983ff'] },
  { id: 'secret-treasure', category: 'challenge', emoji: '🗝️', label: 'Chasseuse de trésors', description: 'Découvrir un nouvel objet rare dans un coffre', metric: 'rareTreasureCount', target: 1, repeatable: true, gradient: ['#ffe66d', '#ff6b6b'], secret: true },
];

export const BADGE_CATEGORIES = [
  { id: 'streak', emoji: '🔥', label: 'Régularité', description: 'Revenir apprendre plusieurs jours de suite' },
  { id: 'maitrise', emoji: '🧠', label: 'Talents maîtrisés', description: 'Progresser dans chaque notion' },
  { id: 'parfait', emoji: '💯', label: 'Missions parfaites', description: 'Réussir des missions sans aucune erreur' },
  { id: 'progression', emoji: '🚀', label: 'Grande aventure', description: 'Cumuler les réussites et monter de niveau' },
  { id: 'challenge', emoji: '🎯', label: 'Défis relevés', description: 'Atteindre les objectifs quotidiens et hebdomadaires' },
];

export function badgeMedallionData(earnedBadgeIds, badgeCounts = {}) {
  return BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
    count: badgeCounts[badge.id] ?? (earnedBadgeIds.includes(badge.id) ? 1 : 0),
  }));
}

function medallionHtml(badge) {
  if (badge.earned) {
    return `<div class="badge-medallion earned" role="img" aria-label="Badge gagné ${badge.count} fois : ${badge.label}" style="background: linear-gradient(135deg, ${badge.gradient[0]}, ${badge.gradient[1]})" title="${badge.label} · gagné ${badge.count} fois">${badge.emoji}${badge.count > 1 ? `<strong class="badge-copy-count">×${badge.count}</strong>` : ''}</div>`;
  }
  return `<div class="badge-medallion locked" role="img" aria-label="Badge verrouillé : ${badge.label}" title="${badge.label}">🔒</div>`;
}

export function renderBadgeMedallionsHtml(earnedBadgeIds, badgeCounts = {}) {
  const data = badgeMedallionData(earnedBadgeIds, badgeCounts);
  return BADGE_CATEGORIES.map((category) => {
    const badgesInCategory = data.filter((b) => b.category === category.id);
    const earned = badgesInCategory.filter((badge) => badge.earned);
    const preview = [...earned, ...badgesInCategory.filter((badge) => !badge.earned).slice(0, 1)];
    return `
      <div class="badge-category">
        <h3 class="badge-category-title"><span>${category.emoji} ${category.label}</span><strong>${earned.length}/${badgesInCategory.length}</strong></h3>
        <div class="badges-row">${preview.map(medallionHtml).join('')}</div>
      </div>
    `;
  }).join('');
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Formate une date "YYYY-MM-DD" en "7 août 2026".
export function formatDateFr(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS_FR[month - 1]} ${year}`;
}

// Données pour l'album des badges : uniquement les badges gagnés, avec leur
// date de déblocage formatée, triés du plus récent au plus ancien.
export function badgeAlbumData(earnedBadgeIds, badgeDates = {}) {
  return BADGES.filter((badge) => earnedBadgeIds.includes(badge.id))
    .map((badge) => ({
      ...badge,
      unlockedAt: badgeDates[badge.id] ?? null,
      unlockedAtLabel: badgeDates[badge.id] ? formatDateFr(badgeDates[badge.id]) : null,
    }))
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''));
}

function progressForBadge(badge, profile) {
  if (badge.metric.startsWith('mastery-')) {
    const type = badge.metric.replace('mastery-', '');
    return profile.difficultyLevels?.[type] ?? 1;
  }
  return profile[badge.metric] ?? 0;
}

export function badgeCollectionData(profile = {}) {
  const earnedBadgeIds = profile.badges ?? [];
  const badgeDates = profile.badgeDates ?? {};
  return BADGES.map((badge) => {
    const earned = earnedBadgeIds.includes(badge.id);
    const badgeProfile = { ...profile, rareTreasureCount: profile.rareTreasureIds?.length ?? profile.rareTreasureCount ?? 0 };
    const progress = earned ? badge.target : Math.min(progressForBadge(badge, badgeProfile), badge.target);
    return {
      ...badge,
      earned,
      count: profile.badgeCounts?.[badge.id] ?? (earned ? 1 : 0),
      progress,
      progressPercent: Math.round((progress / badge.target) * 100),
      progressLabel: `${progress}/${badge.target}`,
      unlockedAt: badgeDates[badge.id] ?? null,
      unlockedAtLabel: badgeDates[badge.id] ? formatDateFr(badgeDates[badge.id]) : null,
    };
  });
}

export function badgeCountsAfterAwards(existingCounts = {}, earnedBadgeIds = [], awardedBadgeIds = []) {
  const next = { ...existingCounts };
  earnedBadgeIds.forEach((id) => {
    if (!Number.isInteger(next[id]) || next[id] < 1) next[id] = 1;
  });
  awardedBadgeIds.forEach((id) => {
    next[id] = (next[id] ?? 0) + 1;
  });
  return next;
}

export function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge?.emoji ?? learningTypeEmoji(type) ?? '❓';
}
