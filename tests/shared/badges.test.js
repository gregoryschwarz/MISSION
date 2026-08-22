import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml, emojiForType, formatDateFr, badgeAlbumData, badgeCollectionData, badgeCountsAfterAwards } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 31 badges with a category, in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'streak-3',
      'streak-7',
      'streak-30',
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
      'mastery-division',
      'mastery-fraction',
      'mastery-geometrie',
      'mastery-monnaie',
      'mastery-longueur',
      'mastery-temps',
      'mastery-probleme',
      'mastery-accord-pluriel',
      'perfect-1',
      'perfect-10',
      'perfect-50',
      'answers-50',
      'answers-250',
      'answers-1000',
      'level-5',
      'level-10',
      'level-20',
      'daily-1',
      'daily-7',
      'daily-30',
      'weekly-1',
      'weekly-5',
      'weekly-10',
      'secret-treasure',
    ]);
  });

  it('assigns every badge to one of the 5 known categories', () => {
    const categoryIds = BADGE_CATEGORIES.map((c) => c.id);
    BADGES.forEach((badge) => expect(categoryIds).toContain(badge.category));
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3', 'mastery-division']);
    expect(result).toHaveLength(31);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-division')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'streak-7')).toMatchObject({ earned: false });
  });

  it('marks no badges as earned for an empty list', () => {
    const result = badgeMedallionData([]);
    result.forEach((b) => expect(b.earned).toBe(false));
  });

  it('preserves the fixed badge order regardless of input order', () => {
    const result = badgeMedallionData(['perfect-50', 'streak-3']);
    expect(result.map((b) => b.id)).toEqual(BADGES.map((b) => b.id));
  });

  it('includes the persistent number of times a badge was earned', () => {
    const result = badgeMedallionData(['daily-1'], { 'daily-1': 4 });
    expect(result.find((badge) => badge.id === 'daily-1')).toMatchObject({ earned: true, count: 4 });
  });
});

describe('renderBadgeMedallionsHtml', () => {
  it('renders an earned badge with its emoji and the earned class', () => {
    const html = renderBadgeMedallionsHtml(['streak-3']);
    expect(html).toContain('badge-medallion earned');
    expect(html).toContain('🔥');
  });

  it('shows a counter when the same badge was earned several times', () => {
    const html = renderBadgeMedallionsHtml(['daily-1'], { 'daily-1': 4 });
    expect(html).toContain('×4');
  });

  it('renders a locked badge with a lock icon and the locked class', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('badge-medallion locked');
    expect(html).toContain('🔒');
  });

  it('groups badges into 5 compact category summaries', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('Régularité');
    expect(html).toContain('Talents maîtrisés');
    expect(html).toContain('Missions parfaites');
    expect(html).toContain('Grande aventure');
    expect(html).toContain('Défis relevés');
  });

  it('renders the new division and fraction mastery badges when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-division', 'mastery-fraction']);
    expect(html).toContain('➗');
    expect(html).toContain('🍕');
  });

  it('renders the geometrie mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-geometrie']);
    expect(html).toContain('📐');
  });

  it('renders the monnaie, longueur, and temps mastery badges when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-monnaie', 'mastery-longueur', 'mastery-temps']);
    expect(html).toContain('💶');
    expect(html).toContain('📏');
    expect(html).toContain('🕐');
  });

  it('renders the probleme mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-probleme']);
    expect(html).toContain('🧩');
  });

  it('renders the accord-pluriel mastery badge when earned', () => {
    const html = renderBadgeMedallionsHtml(['mastery-accord-pluriel']);
    expect(html).toContain('🔤');
  });
});

describe('formatDateFr', () => {
  it('formats an ISO date into a French long date', () => {
    expect(formatDateFr('2026-08-07')).toBe('7 août 2026');
  });
  it('formats a single-digit month correctly', () => {
    expect(formatDateFr('2026-01-03')).toBe('3 janvier 2026');
  });
});

describe('badgeAlbumData', () => {
  it('only includes earned badges', () => {
    const result = badgeAlbumData(['streak-3'], { 'streak-3': '2026-08-07' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'streak-3', unlockedAt: '2026-08-07', unlockedAtLabel: '7 août 2026' });
  });

  it('returns an empty array when nothing is earned', () => {
    expect(badgeAlbumData([], {})).toEqual([]);
  });

  it('handles a missing unlock date gracefully', () => {
    const result = badgeAlbumData(['streak-3'], {});
    expect(result[0].unlockedAt).toBeNull();
    expect(result[0].unlockedAtLabel).toBeNull();
  });

  it('sorts the most recently unlocked badge first', () => {
    const result = badgeAlbumData(['streak-3', 'perfect-1'], {
      'streak-3': '2026-08-01',
      'perfect-1': '2026-08-07',
    });
    expect(result.map((b) => b.id)).toEqual(['perfect-1', 'streak-3']);
  });
});

describe('badgeCollectionData', () => {
  it('shows earned and locked badges with meaningful progress', () => {
    const result = badgeCollectionData({
      badges: ['streak-3'],
      badgeDates: { 'streak-3': '2026-08-07' },
      badgeCounts: { 'streak-3': 3 },
      streakDays: 3,
      totalCorrectCount: 125,
      avatarLevel: 4,
    });
    expect(result).toHaveLength(31);
    expect(result.find((badge) => badge.id === 'streak-3')).toMatchObject({ earned: true, count: 3, progressPercent: 100, unlockedAtLabel: '7 août 2026' });
    expect(result.find((badge) => badge.id === 'answers-250')).toMatchObject({ earned: false, progress: 125, progressPercent: 50 });
    expect(result.find((badge) => badge.id === 'level-5')).toMatchObject({ progressLabel: '4/5' });
  });

  it('uses notion difficulty as mastery progress', () => {
    const result = badgeCollectionData({ difficultyLevels: { monnaie: 2 } });
    expect(result.find((badge) => badge.id === 'mastery-monnaie')).toMatchObject({ progress: 2, progressLabel: '2/3' });
  });
});

describe('badgeCountsAfterAwards', () => {
  it('migrates old earned badges to one copy and increments new awards', () => {
    expect(badgeCountsAfterAwards({}, ['daily-1'], ['daily-1'])).toEqual({ 'daily-1': 2 });
  });

  it('preserves existing counts while adding a first copy', () => {
    expect(badgeCountsAfterAwards({ 'daily-1': 4 }, ['daily-1'], ['weekly-1'])).toEqual({ 'daily-1': 4, 'weekly-1': 1 });
  });
});

describe('emojiForType', () => {
  it('returns the correct emoji for each of the 12 mastery types', () => {
    expect(emojiForType('addition')).toBe('➕');
    expect(emojiForType('soustraction')).toBe('➖');
    expect(emojiForType('multiplication')).toBe('✖️');
    expect(emojiForType('comparaison')).toBe('⚖️');
    expect(emojiForType('division')).toBe('➗');
    expect(emojiForType('fraction')).toBe('🍕');
    expect(emojiForType('geometrie')).toBe('📐');
    expect(emojiForType('monnaie')).toBe('💶');
    expect(emojiForType('longueur')).toBe('📏');
    expect(emojiForType('temps')).toBe('🕐');
    expect(emojiForType('probleme')).toBe('🧩');
    expect(emojiForType('accord-pluriel')).toBe('🔤');
  });

  it('returns the fallback emoji for an unknown type', () => {
    expect(emojiForType('unknown')).toBe('❓');
  });
});
