import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(),
}));

import { ensureDeviceAuth } from '../../src/child/authSession.js';

describe('device auth restoration', () => {
  it('waits for the persisted anonymous user before deciding to sign in', async () => {
    const signIn = vi.fn();
    const user = { uid: 'persisted-device' };
    const auth = {
      currentUser: null,
      authStateReady: vi.fn(async () => {
        auth.currentUser = user;
      }),
    };

    expect(await ensureDeviceAuth(auth, signIn)).toBe(user);
    expect(auth.authStateReady).toHaveBeenCalledOnce();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('creates an anonymous user only when no persisted user exists', async () => {
    const user = { uid: 'new-device' };
    const auth = {
      currentUser: null,
      authStateReady: vi.fn(),
    };
    const signIn = vi.fn(async () => {
      auth.currentUser = user;
    });

    expect(await ensureDeviceAuth(auth, signIn)).toBe(user);
    expect(signIn).toHaveBeenCalledWith(auth);
  });
});
