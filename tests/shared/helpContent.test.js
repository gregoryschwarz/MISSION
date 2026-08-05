import { describe, it, expect } from 'vitest';
import { HELP_TEXT, helpTextForType } from '../../src/shared/helpContent.js';

describe('HELP_TEXT', () => {
  it('defines a help text for each of the 6 question types, in a fixed order', () => {
    expect(Object.keys(HELP_TEXT)).toEqual([
      'addition',
      'soustraction',
      'multiplication',
      'comparaison',
      'division',
      'fraction',
    ]);
  });
});

describe('helpTextForType', () => {
  it('returns the exact text defined in HELP_TEXT for each known type', () => {
    Object.keys(HELP_TEXT).forEach((type) => {
      expect(helpTextForType(type)).toBe(HELP_TEXT[type]);
    });
  });

  it('returns a fallback message for an unknown type', () => {
    expect(helpTextForType('unknown')).toBe("Pas d'aide disponible pour cette notion.");
  });
});
