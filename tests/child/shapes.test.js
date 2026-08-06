import { describe, it, expect } from 'vitest';
import { SHAPES, shapeSvg, shapeSides } from '../../src/child/shapes.js';

describe('SHAPES', () => {
  it('defines the 7 shapes used across the 3 difficulty levels', () => {
    expect(Object.keys(SHAPES).sort()).toEqual([
      'carre',
      'cercle',
      'hexagone',
      'losange',
      'pentagone',
      'rectangle',
      'triangle',
    ]);
  });
});

describe('shapeSides', () => {
  it('returns the correct side count for each shape', () => {
    expect(shapeSides('cercle')).toBe(0);
    expect(shapeSides('triangle')).toBe(3);
    expect(shapeSides('carre')).toBe(4);
    expect(shapeSides('rectangle')).toBe(4);
    expect(shapeSides('losange')).toBe(4);
    expect(shapeSides('pentagone')).toBe(5);
    expect(shapeSides('hexagone')).toBe(6);
  });

  it('returns 0 for an unknown shape id', () => {
    expect(shapeSides('unknown')).toBe(0);
  });
});

describe('shapeSvg', () => {
  it('returns non-empty SVG markup for every known shape', () => {
    Object.keys(SHAPES).forEach((id) => {
      expect(shapeSvg(id)).toContain('<svg');
    });
  });

  it('returns an empty string for an unknown shape id', () => {
    expect(shapeSvg('unknown')).toBe('');
  });
});
