import { describe, it, expect } from 'vitest';
import { BADGES, badgeMedallionData, renderBadgeMedallionsHtml } from '../../src/shared/badges.js';

describe('BADGES', () => {
  it('defines exactly the 3 streak badges in a fixed order', () => {
    expect(BADGES.map((b) => b.id)).toEqual(['streak-3', 'streak-7', 'streak-30']);
  });
});

describe('badgeMedallionData', () => {
  it('marks badges as earned when their id is present', () => {
    const result = badgeMedallionData(['streak-3']);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'streak-3', earned: true });
    expect(result[1]).toMatchObject({ id: 'streak-7', earned: false });
    expect(result[2]).toMatchObject({ id: 'streak-30', earned: false });
  });

  it('marks no badges as earned for an empty list', () => {
    const result = badgeMedallionData([]);
    result.forEach((b) => expect(b.earned).toBe(false));
  });

  it('preserves the fixed badge order regardless of input order', () => {
    const result = badgeMedallionData(['streak-30', 'streak-3']);
    expect(result.map((b) => b.id)).toEqual(['streak-3', 'streak-7', 'streak-30']);
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
});
