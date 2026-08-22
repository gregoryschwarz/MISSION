import { describe, expect, it } from 'vitest';
import { seasonForDate, seasonForMonth } from '../../src/shared/seasons.js';

describe('seasonForMonth', () => {
  it('maps every month to the expected meteorological season', () => {
    expect([0, 1, 11].map(seasonForMonth)).toEqual(['winter', 'winter', 'winter']);
    expect([2, 3, 4].map(seasonForMonth)).toEqual(['spring', 'spring', 'spring']);
    expect([5, 6, 7].map(seasonForMonth)).toEqual(['summer', 'summer', 'summer']);
    expect([8, 9, 10].map(seasonForMonth)).toEqual(['autumn', 'autumn', 'autumn']);
  });

  it('derives the season from a date', () => {
    expect(seasonForDate(new Date(2026, 11, 15))).toBe('winter');
    expect(seasonForDate(new Date(2026, 7, 22))).toBe('summer');
  });
});
