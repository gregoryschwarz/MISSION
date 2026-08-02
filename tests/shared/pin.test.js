import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin } from '../../src/shared/pin.js';

describe('hashPin', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await hashPin('1234');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).toBe(b);
  });

  it('produces different hashes for different PINs', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('4321');
    expect(a).not.toBe(b);
  });
});

describe('verifyPin', () => {
  it('returns true for a matching PIN', async () => {
    const hash = await hashPin('7890');
    expect(await verifyPin('7890', hash)).toBe(true);
  });

  it('returns false for a non-matching PIN', async () => {
    const hash = await hashPin('7890');
    expect(await verifyPin('0000', hash)).toBe(false);
  });
});
