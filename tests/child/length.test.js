import { describe, it, expect } from 'vitest';
import { lengthBarSvg } from '../../src/child/length.js';

describe('lengthBarSvg', () => {
  it('returns SVG markup containing the proportional width for a value under maxCm', () => {
    const svg = lengthBarSvg(10, 20);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="50"');
  });

  it('caps the width at 100% when cm reaches or exceeds maxCm', () => {
    expect(lengthBarSvg(20, 20)).toContain('width="100"');
    expect(lengthBarSvg(30, 20)).toContain('width="100"');
  });

  it('uses a default maxCm of 20 when not provided', () => {
    expect(lengthBarSvg(10)).toContain('width="50"');
  });
});
