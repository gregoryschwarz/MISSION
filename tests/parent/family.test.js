import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: () => ({}),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: (...args) => {
    // doc(collectionRef) with no id → simulate Firestore auto-generated id.
    if (args[0] && args[0].__ref === 'collection' && args.length === 1) {
      return { __ref: 'doc', id: 'generated-id', args };
    }
    return { __ref: 'doc', args };
  },
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  getDocsFromServer: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: (...args) => ({ __ref: 'collection', args }),
  query: (...args) => args,
  where: (...args) => args,
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
}));

import { setDoc, getDoc, getDocs, getDocsFromServer, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  DEFAULT_REWARDS,
  createFamily,
  createChild,
  fetchChildren,
  fetchChildProfile,
  fetchPairingRequests,
  ensurePairingCodes,
  ensureDefaultRewards,
  revokeChildDevice,
  approvePairingRequest,
  setFocusType,
  setEnabledSubjects,
  createReward,
  updateReward,
  fetchRewards,
  requestReward,
  fetchRewardRequests,
  resolveRewardRequest,
  ensureAvatarPackSettings,
  fetchAvatarPackSettings,
  updateAvatarPackSetting,
  creditChildCoins,
} from '../../src/parent/family.js';

describe('creditChildCoins', () => {
  it('adds a parent credit without replacing the existing balance incorrectly', async () => {
    expect(await creditChildCoins('c1', 35, 25)).toBe(60);
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { coins: 60 }, { merge: true });
  });

  it('rejects invalid or excessive credits', async () => {
    expect(await creditChildCoins('c1', 35, 0)).toBeNull();
    expect(await creditChildCoins('c1', 35, 10001)).toBeNull();
  });
});

beforeEach(() => {
  setDoc.mockReset();
  getDoc.mockReset();
  getDocs.mockReset();
  getDocsFromServer.mockReset();
  getDocsFromServer.mockImplementation((reference) => getDocs(reference));
  addDoc.mockReset();
  updateDoc.mockReset();
  writeBatch.mockClear();
});

describe('createFamily', () => {
  it('creates a bare family document without any child', async () => {
    const id = await createFamily({ parentUid: 'uid-1', parentEmail: 'a@b.com' });
    expect(typeof id).toBe('string');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ parentUid: 'uid-1', parentEmail: 'a@b.com' })
    );
  });
});

describe('createChild', () => {
  it('creates an unpaired child document with default profile fields', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const id = await createChild('family-abc', { childName: 'Ambre' });
    expect(typeof id).toBe('string');
    const batch = writeBatch.mock.results[0].value;
    const [, payload] = batch.set.mock.calls[0];
    expect(payload).toMatchObject({
      familyId: 'family-abc',
      childName: 'Ambre',
      xp: 0,
      avatarLevel: 1,
      coins: 0,
      totalCorrectCount: 0,
      deviceUid: null,
      ownedPackIds: ['starter-pack'],
      enabledSubjects: ['anglais', 'culture-generale', 'sciences', 'histoire-geographie', 'logique', 'orthographe', 'arts'],
    });
    expect(payload.pairingCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(batch.set).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalledOnce();
  });
});

describe('DEFAULT_REWARDS', () => {
  it('provides a progressive catalogue with four categories and a mystery reward', () => {
    expect(DEFAULT_REWARDS).toHaveLength(17);
    expect(new Set(DEFAULT_REWARDS.map((reward) => reward.category))).toEqual(new Set(['surprise', 'treat', 'privilege', 'treasure']));
    expect(DEFAULT_REWARDS.find((reward) => reward.id === 'pajama-party')).toMatchObject({ cost: 180, category: 'privilege' });
    expect(DEFAULT_REWARDS.find((reward) => reward.mystery)).toMatchObject({ id: 'small-surprise', cost: 75 });
  });
});

describe('ensureDefaultRewards', () => {
  it('migrates legacy presets and adds the new rewards missing from an existing catalogue', async () => {
    const batch = { set: vi.fn(), update: vi.fn(), commit: vi.fn() };
    writeBatch.mockReturnValueOnce(batch);
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'pajama-party', data: () => ({ name: 'Une soirée pyjama', cost: 100 }) }],
    });
    expect(await ensureDefaultRewards('family-abc')).toBe(true);
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), {
      active: true,
      category: 'privilege',
      cost: 180,
      emoji: '🌙',
      name: 'Une soirée pyjama',
    });
    expect(batch.set).toHaveBeenCalledTimes(16);
    expect(batch.commit).toHaveBeenCalledOnce();
  });
});

describe('family avatar pack settings', () => {
  it('automatically adds every pack missing from the family catalogue', async () => {
    const batch = { set: vi.fn(), update: vi.fn(), commit: vi.fn() };
    writeBatch.mockReturnValueOnce(batch);
    getDocs.mockResolvedValueOnce({ docs: [] });
    expect(await ensureAvatarPackSettings('family-abc')).toBe(true);
    expect(batch.set).toHaveBeenCalledTimes(30);
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it('merges parent overrides with every code-defined pack', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'magic-pack', data: () => ({ active: false, cost: 42, requiredLevel: 11 }) }],
    });
    const packs = await fetchAvatarPackSettings('family-abc');
    expect(packs).toHaveLength(30);
    expect(packs.find((pack) => pack.id === 'magic-pack')).toMatchObject({ active: false, cost: 42, requiredLevel: 11 });
    expect(packs.find((pack) => pack.id === 'starter-pack').active).toBe(true);
  });

  it('stores only valid editable fields for a pack', async () => {
    expect(await updateAvatarPackSetting('family-abc', 'magic-pack', { active: false, cost: 75, requiredLevel: 9, name: 'ignored' })).toBe(true);
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { active: false, cost: 75, requiredLevel: 9 }, { merge: true });
  });
});

describe('pairing approval', () => {
  it('revokes a child device without changing the rest of the profile', async () => {
    await revokeChildDevice('c1');
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { deviceUid: null }, { merge: true });
  });

  it('repairs a missing short-code mapping for an existing child', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const child = { id: 'c1', familyId: 'family-abc', childName: 'Ambre', pairingCode: '56WZU6' };
    expect(await ensurePairingCodes([child])).toEqual([child]);
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      { childId: 'c1', familyId: 'family-abc' }
    );
  });

  it('lists pending requests with their child identity', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'device-1', data: () => ({ requesterUid: 'device-1', status: 'pending' }) }],
    });
    expect(await fetchPairingRequests([{ id: 'c1', childName: 'Ambre', deviceUid: 'old-device' }])).toEqual([
      { id: 'device-1', childId: 'c1', childName: 'Ambre', replacesDevice: true, requesterUid: 'device-1', status: 'pending' },
    ]);
  });

  it('atomically links the device and approves its request', async () => {
    await approvePairingRequest('c1', 'device-1');
    const batch = writeBatch.mock.results[0].value;
    expect(batch.update).toHaveBeenCalledTimes(2);
    expect(batch.update).toHaveBeenNthCalledWith(1, expect.anything(), { deviceUid: 'device-1' });
    expect(batch.commit).toHaveBeenCalledOnce();
  });
});

describe('fetchChildren', () => {
  it('maps documents to plain objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ familyId: 'family-abc', childName: 'Ambre' }) },
        { id: 'c2', data: () => ({ familyId: 'family-abc', childName: 'Luna' }) },
      ],
    });
    const children = await fetchChildren('family-abc');
    expect(getDocsFromServer).toHaveBeenCalledOnce();
    expect(children).toEqual([
      { id: 'c1', familyId: 'family-abc', childName: 'Ambre' },
      { id: 'c2', familyId: 'family-abc', childName: 'Luna' },
    ]);
  });
});

describe('fetchChildProfile', () => {
  it('returns null when the child does not exist', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await fetchChildProfile('unknown')).toBeNull();
  });

  it('returns the profile with its id when it exists', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, id: 'c1', data: () => ({ childName: 'Ambre', coins: 10 }) });
    expect(await fetchChildProfile('c1')).toEqual({ id: 'c1', childName: 'Ambre', coins: 10 });
  });
});

describe('setFocusType', () => {
  it('merges the focusType onto the child document', async () => {
    await setFocusType('c1', 'addition');
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { focusType: 'addition' }, { merge: true });
  });
});

describe('setEnabledSubjects', () => {
  it('stores only known unique subjects in catalogue order', async () => {
    await setEnabledSubjects('c1', ['arts', 'anglais', 'unknown', 'arts']);
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { enabledSubjects: ['anglais', 'arts'] }, { merge: true });
  });
});

describe('requestReward', () => {
  it('fails without spending or creating a request when coins are insufficient', async () => {
    const profile = { coins: 3 };
    const reward = { id: 'r1', name: 'Bonbon', cost: 5 };
    const result = await requestReward('c1', profile, reward);
    expect(result).toEqual({ success: false, reason: 'insufficient-coins' });
    expect(setDoc).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('deducts coins and creates a pending request when coins are sufficient', async () => {
    const profile = { coins: 10 };
    const reward = { id: 'r1', name: 'Bonbon', cost: 5 };
    const result = await requestReward('c1', profile, reward);
    expect(result).toEqual({ success: true, coins: 5 });
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { coins: 5 }, { merge: true });
    expect(addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __ref: 'collection' }),
      expect.objectContaining({ rewardId: 'r1', rewardName: 'Bonbon', cost: 5, status: 'pending' })
    );
  });
});

describe('fetchRewardRequests', () => {
  it('maps documents to plain objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'req1', data: () => ({ rewardName: 'Bonbon', cost: 5, status: 'pending' }) }],
    });
    const requests = await fetchRewardRequests('c1');
    expect(requests).toEqual([{ id: 'req1', rewardName: 'Bonbon', cost: 5, status: 'pending' }]);
  });
});

describe('resolveRewardRequest', () => {
  it('marks the request approved without touching the coin balance', async () => {
    const profile = { coins: 5 };
    const request = { id: 'req1', cost: 5 };
    const result = await resolveRewardRequest('c1', profile, request, 'approved');
    expect(result).toEqual({ coins: 5 });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'approved', resolvedAt: 'SERVER_TIMESTAMP' });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('refunds the coins when the request is rejected', async () => {
    const profile = { coins: 5 };
    const request = { id: 'req1', cost: 5 };
    const result = await resolveRewardRequest('c1', profile, request, 'rejected');
    expect(result).toEqual({ coins: 10 });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'rejected', resolvedAt: 'SERVER_TIMESTAMP' });
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), { coins: 10 }, { merge: true });
  });
});

describe('createReward / fetchRewards (family-level catalog, unchanged by multi-enfants)', () => {
  it('adds a reward document with name and cost', async () => {
    addDoc.mockResolvedValueOnce({ id: 'reward-1' });
    const id = await createReward('family-abc', { name: 'Bonbon', cost: 5 });
    expect(id).toBe('reward-1');
  });

  it('updates the name and coin cost of an existing reward', async () => {
    await updateReward('family-abc', 'r1', { name: 'Sortie vélo', cost: 35 });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { name: 'Sortie vélo', cost: 35 });
  });

  it('maps reward documents to plain objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'r1', data: () => ({ name: 'Bonbon', cost: 5 }) }],
    });
    const rewards = await fetchRewards('family-abc');
    expect(rewards).toEqual([{ id: 'r1', name: 'Bonbon', cost: 5, emoji: '🎁', active: true }]);
  });
});
