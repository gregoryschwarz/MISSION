import { describe, it, expect } from 'vitest';
import { BADGES, BADGE_CATEGORIES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines all 10 badges with a category, in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'streak-3',
      'streak-7',
      'streak-30',
      'mastery-addition',
      'mastery-soustraction',
      'mastery-multiplication',
      'mastery-comparaison',
      'perfect-1',
      'perfect-10',
      'perfect-50',
    ]);
  });

  it('assigns every badge to one of the 3 known categories', () => {
    const categoryIds = BADGE_CATEGORIES.map((c) => c.id);
    BADGES.forEach((badge) => expect(categoryIds).toContain(badge.category));
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3', 'mastery-addition']);
    expect(result).toHaveLength(10);
    expect(result.find((b) => b.id === 'streak-3')).toMatchObject({ earned: true });
    expect(result.find((b) => b.id === 'mastery-addition')).toMatchObject({ earned: true });
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
});

describe('renderBadgeMedallionsHtml', () => {
  it('renders an earned badge with its emoji and the earned class', () => {
    const html = renderBadgeMedallionsHtml(['streak-3']);
    expect(html).toContain('badge-medallion earned');
    expect(html).toContain('🔥');
  });

  it('renders a locked badge with a lock icon and the locked class', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('badge-medallion locked');
    expect(html).toContain('🔒');
  });

  it('groups badges into 3 category sections with the right titles', () => {
    const html = renderBadgeMedallionsHtml([]);
    expect(html).toContain('Série');
    expect(html).toContain('Maîtrise');
    expect(html).toContain('Missions parfaites');
  });

  it('renders all 4 mastery badges and all 3 perfect-mission badges', () => {
    const html = renderBadgeMedallionsHtml(['mastery-addition', 'perfect-1']);
    expect(html).toContain('➕');
    expect(html).toContain('💯');
  });
});
