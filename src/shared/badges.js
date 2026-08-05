export const BADGES = [
  { id: 'streak-3', category: 'streak', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', category: 'streak', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', category: 'streak', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
  { id: 'mastery-addition', category: 'maitrise', emoji: '➕', label: 'Addition maîtrisée', gradient: ['#a8e6cf', '#dcedc1'] },
  { id: 'mastery-soustraction', category: 'maitrise', emoji: '➖', label: 'Soustraction maîtrisée', gradient: ['#ffaaa5', '#ffd3b6'] },
  { id: 'mastery-multiplication', category: 'maitrise', emoji: '✖️', label: 'Multiplication maîtrisée', gradient: ['#a2d2ff', '#bde0fe'] },
  { id: 'mastery-comparaison', category: 'maitrise', emoji: '⚖️', label: 'Comparaison maîtrisée', gradient: ['#cdb4db', '#ffc8dd'] },
  { id: 'mastery-division', category: 'maitrise', emoji: '➗', label: 'Division maîtrisée', gradient: ['#ffe5a0', '#ffcb77'] },
  { id: 'mastery-fraction', category: 'maitrise', emoji: '🍕', label: 'Fractions maîtrisées', gradient: ['#4ecdc4', '#a0e7e5'] },
  { id: 'perfect-1', category: 'parfait', emoji: '💯', label: '1 mission parfaite', gradient: ['#ffd166', '#f4a261'] },
  { id: 'perfect-10', category: 'parfait', emoji: '🌈', label: '10 missions parfaites', gradient: ['#ff9a8b', '#ff6a88'] },
  { id: 'perfect-50', category: 'parfait', emoji: '💎', label: '50 missions parfaites', gradient: ['#84fab0', '#8fd3f4'] },
];

export const BADGE_CATEGORIES = [
  { id: 'streak', label: 'Série' },
  { id: 'maitrise', label: 'Maîtrise' },
  { id: 'parfait', label: 'Missions parfaites' },
];

export function badgeMedallionData(earnedBadgeIds) {
  return BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
  }));
}

function medallionHtml(badge) {
  if (badge.earned) {
    return `<div class="badge-medallion earned" style="background: linear-gradient(135deg, ${badge.gradient[0]}, ${badge.gradient[1]})" title="${badge.label}">${badge.emoji}</div>`;
  }
  return `<div class="badge-medallion locked" title="${badge.label}">🔒</div>`;
}

export function renderBadgeMedallionsHtml(earnedBadgeIds) {
  const data = badgeMedallionData(earnedBadgeIds);
  return BADGE_CATEGORIES.map((category) => {
    const badgesInCategory = data.filter((b) => b.category === category.id);
    return `
      <div class="badge-category">
        <h3 class="badge-category-title">${category.label}</h3>
        <div class="badges-row">${badgesInCategory.map(medallionHtml).join('')}</div>
      </div>
    `;
  }).join('');
}

export function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
