import { describe, it, expect } from 'vitest';
import { COINS, coinSvg, formatEuroCents, parseEuroInput } from '../../src/child/money.js';

describe('COINS', () => {
  it('defines the 10 denominations from 1 centime to 10 euros', () => {
    expect(Object.keys(COINS)).toEqual(['1c', '2c', '5c', '10c', '20c', '50c', '1e', '2e', '5e', '10e']);
  });

  it('gives each denomination its value in centimes', () => {
    expect(COINS['1c'].value).toBe(1);
    expect(COINS['2c'].value).toBe(2);
    expect(COINS['5c'].value).toBe(5);
    expect(COINS['10c'].value).toBe(10);
    expect(COINS['20c'].value).toBe(20);
    expect(COINS['50c'].value).toBe(50);
    expect(COINS['1e'].value).toBe(100);
    expect(COINS['2e'].value).toBe(200);
    expect(COINS['5e'].value).toBe(500);
    expect(COINS['10e'].value).toBe(1000);
  });
});

describe('coinSvg', () => {
  it('returns non-empty SVG markup for every known denomination', () => {
    Object.keys(COINS).forEach((id) => {
      expect(coinSvg(id)).toContain('<svg');
    });
  });

  it('returns an empty string for an unknown id', () => {
    expect(coinSvg('unknown')).toBe('');
  });

  it('renders coins and banknotes with accessible euro artwork', () => {
    expect(coinSvg('2e')).toContain('euro-coin');
    expect(coinSvg('5e')).toContain('euro-note');
    expect(coinSvg('10e')).toContain('Billet de 10 euros');
  });
});

describe('euro formatting', () => {
  it('formats internal cent values as French euro amounts', () => {
    expect(formatEuroCents(2)).toBe('0,02 €');
    expect(formatEuroCents(700)).toBe('7,00 €');
    expect(formatEuroCents(1250)).toBe('12,50 €');
  });

  it('parses natural euro input without changing internal cent storage', () => {
    expect(parseEuroInput('7')).toBe(700);
    expect(parseEuroInput('7,00 €')).toBe(700);
    expect(parseEuroInput('12.50')).toBe(1250);
    expect(parseEuroInput('sept euros')).toBe(null);
  });
});
