import { doc, setDoc, getDoc, getDocs, addDoc, updateDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { hashPin } from '../shared/pin.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { DEFAULT_CHARACTER, DEFAULT_HAT, DEFAULT_CAPE, DEFAULT_DECOR } from '../shared/avatarCustomization.js';
import { spendCoins, refundCoins } from '../shared/progression.js';

// --- Compte parent (une famille = un parent Google, peut avoir plusieurs enfants) ---

export async function findFamilyByParent(parentUid) {
  const q = query(collection(db, 'families'), where('parentUid', '==', parentUid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const familyDoc = snapshot.docs[0];
  return { id: familyDoc.id, ...familyDoc.data() };
}

export async function createFamily({ parentUid, parentEmail }) {
  const familyRef = doc(collection(db, 'families'));
  await setDoc(familyRef, {
    parentUid,
    parentEmail,
    createdAt: serverTimestamp(),
  });
  return familyRef.id;
}

// --- Enfants ---
// Chaque enfant est un document top-level dans "children" (et non imbriqué sous
// "families") : son id sert directement de code d'appairage, et chaque enfant a
// son propre PIN — support multi-enfants avec isolation par enfant.

export async function createChild(familyId, { childName, pin }) {
  const pinHash = await hashPin(pin);
  const childRef = doc(collection(db, 'children'));
  await setDoc(childRef, {
    familyId,
    childName,
    pinHash,
    xp: 0,
    avatarLevel: 1,
    badges: [],
    badgeDates: {},
    dailyChallengeDate: null,
    dailyChallengeProgress: 0,
    dailyChallengeCompleted: false,
    streakDays: 0,
    lastSessionDate: null,
    difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
    perfectMissionsCount: 0,
    totalCorrectCount: 0,
    coins: 0,
    selectedCharacter: DEFAULT_CHARACTER,
    selectedHat: DEFAULT_HAT,
    selectedCape: DEFAULT_CAPE,
    selectedDecor: DEFAULT_DECOR,
    ownedCharacterIds: [],
    focusType: null,
    weeklyGoalTarget: 0,
    weeklyGoalProgress: 0,
    weeklyGoalWeekStart: null,
    createdAt: serverTimestamp(),
  });
  return childRef.id;
}

export async function fetchChildren(familyId) {
  const q = query(collection(db, 'children'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchChildProfile(childId) {
  const snapshot = await getDoc(doc(db, 'children', childId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function setFocusType(childId, focusType) {
  await setDoc(doc(db, 'children', childId), { focusType }, { merge: true });
}

export async function setWeeklyGoalTarget(childId, weeklyGoalTarget) {
  await setDoc(doc(db, 'children', childId), { weeklyGoalTarget }, { merge: true });
}

export async function fetchSessions(childId) {
  const snapshot = await getDocs(collection(db, 'children', childId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// --- Récompenses réelles ---
// Le catalogue de récompenses est partagé par famille (le parent le crée une
// fois) ; les demandes sont propres à chaque enfant.

export async function createReward(familyId, { name, cost }) {
  const ref = await addDoc(collection(db, 'families', familyId, 'rewards'), {
    name,
    cost,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchRewards(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'rewards'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function requestReward(childId, profile, reward) {
  const nextCoins = spendCoins(profile.coins ?? 0, reward.cost);
  if (nextCoins === null) {
    return { success: false, reason: 'insufficient-coins' };
  }
  await setDoc(doc(db, 'children', childId), { coins: nextCoins }, { merge: true });
  await addDoc(collection(db, 'children', childId, 'rewardRequests'), {
    rewardId: reward.id,
    rewardName: reward.name,
    cost: reward.cost,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });
  return { success: true, coins: nextCoins };
}

export async function fetchRewardRequests(childId) {
  const snapshot = await getDocs(collection(db, 'children', childId, 'rewardRequests'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function resolveRewardRequest(childId, profile, request, decision) {
  await updateDoc(doc(db, 'children', childId, 'rewardRequests', request.id), {
    status: decision,
    resolvedAt: serverTimestamp(),
  });
  if (decision !== 'rejected') {
    return { coins: profile.coins ?? 0 };
  }
  const refundedCoins = refundCoins(profile.coins ?? 0, request.cost);
  await setDoc(doc(db, 'children', childId), { coins: refundedCoins }, { merge: true });
  return { coins: refundedCoins };
}
