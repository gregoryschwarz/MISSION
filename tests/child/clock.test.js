import { describe, it, expect } from 'vitest';
import { clockFaceSvg, formatTime } from '../../src/child/clock.js';

describe('formatTime', () => {
  it('formats whole hours with two zero minutes', () => {
    expect(formatTime(3, 0)).toBe('3h00');
    expect(formatTime(14, 0)).toBe('14h00');
  });

  it('formats half hours as h30', () => {
    expect(formatTime(3, 30)).toBe('3h30');
    expect(formatTime(23, 30)).toBe('23h30');
  });
});

describe('clockFaceSvg', () => {
  it('returns non-empty SVG markup for a valid hour/minute', () => {
    expect(clockFaceSvg(3, 0)).toContain('<svg');
    expect(clockFaceSvg(12, 30)).toContain('<svg');
  });

  it('draws different hand positions for different times (the markup is not identical)', () => {
    expect(clockFaceSvg(3, 0)).not.toBe(clockFaceSvg(9, 30));
  });
});
