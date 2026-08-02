export const BADGES = [
  { id: 'streak-3', emoji: '🔥', label: '3 jours', gradient: ['#ffd166', '#ffb8e6'] },
  { id: 'streak-7', emoji: '⭐', label: '7 jours', gradient: ['#c9b8ff', '#8fd6ff'] },
  { id: 'streak-30', emoji: '👑', label: '30 jours', gradient: ['#ffd166', '#ff8fd6'] },
];

export function badgeMedallionData(earnedBadgeIds) {
  return BADGES.map((badge) => ({
    ...badge,
    earned: earnedBadgeIds.includes(badge.id),
  }));
}

export function renderBadgeMedallionsHtml(earnedBadgeIds) {
  return badgeMedallionData(earnedBadgeIds)
    .map((badge) => {
      if (badge.earned) {
        return `<div class="badge-medallion earned" style="background: linear-gradient(135deg, ${badge.gradient[0]}, ${badge.gradient[1]})" title="${badge.label}">${badge.emoji}</div>`;
      }
      return `<div class="badge-medallion locked" title="${badge.label}">🔒</div>`;
    })
    .join('');
}
