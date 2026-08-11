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
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: (...args) => ({ __ref: 'collection', args }),
  query: (...args) => args,
  where: (...args) => args,
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

import { setDoc, getDoc, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import {
  createFamily,
  createChild,
  fetchChildren,
  fetchChildProfile,
  setFocusType,
  createReward,
  fetchRewards,
  requestReward,
  fetchRewardRequests,
  resolveRewardRequest,
} from '../../src/parent/family.js';

beforeEach(() => {
  setDoc.mockReset();
  getDoc.mockReset();
  getDocs.mockReset();
  addDoc.mockReset();
  updateDoc.mockReset();
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
  it('creates a child document with default profile fields and a hashed pin', async () => {
    const id = await createChild('family-abc', { childName: 'Ambre', pin: '1234' });
    expect(typeof id).toBe('string');
    const [, payload] = setDoc.mock.calls[0];
    expect(payload).toMatchObject({
      familyId: 'family-abc',
      childName: 'Ambre',
      xp: 0,
      avatarLevel: 1,
      coins: 0,
      totalCorrectCount: 0,
    });
    expect(payload.pinHash).toBeDefined();
    expect(payload.pinHash).not.toBe('1234');
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

  it('maps reward documents to plain objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'r1', data: () => ({ name: 'Bonbon', cost: 5 }) }],
    });
    const rewards = await fetchRewards('family-abc');
    expect(rewards).toEqual([{ id: 'r1', name: 'Bonbon', cost: 5 }]);
  });
});
