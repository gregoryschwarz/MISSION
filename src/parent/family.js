import { doc, setDoc, getDoc, getDocs, addDoc, updateDoc, collection, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
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
// Chaque enfant est un document top-level dans "children". Un document public
// minimal pairingCodes/{code} traduit le code court en identifiant technique ;
// l'accès au profil exige toujours l'approbation explicite du parent.

const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomPairingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => PAIRING_ALPHABET[value % PAIRING_ALPHABET.length]).join('');
}

async function availablePairingCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomPairingCode();
    const snapshot = await getDoc(doc(db, 'pairingCodes', code));
    if (!snapshot.exists()) return code;
  }
  throw new Error('Impossible de générer un code unique');
}

async function assignPairingCode(childId, familyId) {
  const pairingCode = await availablePairingCode();
  const batch = writeBatch(db);
  batch.update(doc(db, 'children', childId), { pairingCode });
  batch.set(doc(db, 'pairingCodes', pairingCode), { childId, familyId });
  await batch.commit();
  return pairingCode;
}

export async function createChild(familyId, { childName }) {
  const childRef = doc(collection(db, 'children'));
  const pairingCode = await availablePairingCode();
  const batch = writeBatch(db);
  batch.set(childRef, {
    familyId,
    childName,
    deviceUid: null,
    pairingCode,
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
    weeklyRewardText: 'Vendredi et samedi soir : tu peux rester debout plus tard !',
    weeklyRewardDays: ['vendredi', 'samedi'],
    weeklyGoalProgress: 0,
    weeklyGoalWeekStart: null,
    dailyMissionLimit: 3,
    dailyMissionCount: 0,
    dailyMissionCountDate: null,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'pairingCodes', pairingCode), { childId: childRef.id, familyId });
  await batch.commit();
  return childRef.id;
}

export async function fetchPairingRequests(children) {
  const groups = await Promise.all(
    children.map(async (child) => {
      const snapshot = await getDocs(collection(db, 'children', child.id, 'pairingRequests'));
      return snapshot.docs
        .map((requestDoc) => ({
          id: requestDoc.id,
          childId: child.id,
          childName: child.childName,
          replacesDevice: !!child.deviceUid && child.deviceUid !== requestDoc.data().requesterUid,
          ...requestDoc.data(),
        }))
        .filter((request) => request.status === 'pending');
    })
  );
  return groups.flat();
}

export async function approvePairingRequest(childId, deviceUid) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'children', childId), { deviceUid });
  batch.update(doc(db, 'children', childId, 'pairingRequests', deviceUid), {
    status: 'approved',
    resolvedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function rejectPairingRequest(childId, deviceUid) {
  await updateDoc(doc(db, 'children', childId, 'pairingRequests', deviceUid), {
    status: 'rejected',
    resolvedAt: serverTimestamp(),
  });
}

export async function revokeChildDevice(childId) {
  await setDoc(doc(db, 'children', childId), { deviceUid: null }, { merge: true });
}

export async function fetchChildren(familyId) {
  const q = query(collection(db, 'children'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function ensurePairingCodes(children) {
  return Promise.all(
    children.map(async (child) => {
      if (child.pairingCode) {
        const codeRef = doc(db, 'pairingCodes', child.pairingCode);
        const snapshot = await getDoc(codeRef);
        if (!snapshot.exists()) {
          await setDoc(codeRef, { childId: child.id, familyId: child.familyId });
          return child;
        }
        if (snapshot.data().childId === child.id) return child;
        // Collision exceptionnelle avec un autre profil : générer un nouveau code.
      }
      const pairingCode = await assignPairingCode(child.id, child.familyId);
      return { ...child, pairingCode };
    })
  );
}

export async function fetchChildProfile(childId) {
  const snapshot = await getDoc(doc(db, 'children', childId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function setFocusType(childId, focusType) {
  await setDoc(doc(db, 'children', childId), { focusType }, { merge: true });
}

export async function setWeeklyGoalTarget(childId, weeklyGoalTarget, weeklyRewardText, weeklyRewardDays = []) {
  await setDoc(doc(db, 'children', childId), { weeklyGoalTarget, weeklyRewardText, weeklyRewardDays }, { merge: true });
}

export async function setDailyMissionLimit(childId, dailyMissionLimit) {
  await setDoc(doc(db, 'children', childId), { dailyMissionLimit }, { merge: true });
}

export async function fetchSessions(childId) {
  const snapshot = await getDocs(collection(db, 'children', childId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// --- Récompenses réelles ---
// Le catalogue de récompenses est partagé par famille (le parent le crée une
// fois) ; les demandes sont propres à chaque enfant.

export const DEFAULT_REWARDS = [
  { id: 'dessert-choice', emoji: '🍰', name: 'Choisir le dessert', cost: 15 },
  { id: 'music-choice', emoji: '🎵', name: 'Choisir la musique en voiture', cost: 15 },
  { id: 'family-game', emoji: '🎲', name: 'Choisir le jeu de société', cost: 20 },
  { id: 'meal-choice', emoji: '🍕', name: 'Choisir le repas du soir', cost: 25 },
  { id: 'extra-story', emoji: '📖', name: 'Une histoire supplémentaire', cost: 25 },
  { id: 'screen-time', emoji: '🎮', name: '20 minutes d’écran en plus', cost: 30 },
  { id: 'parent-activity', emoji: '🎨', name: 'Choisir une activité avec papa ou maman', cost: 35 },
  { id: 'baking-time', emoji: '🧁', name: 'Faire un gâteau ensemble', cost: 40 },
  { id: 'movie-night', emoji: '🎬', name: 'Choisir le film de la soirée', cost: 45 },
  { id: 'park-trip', emoji: '🌳', name: 'Une sortie au parc', cost: 50 },
  { id: 'small-surprise', emoji: '🎁', name: 'Une petite surprise', cost: 70 },
  { id: 'pajama-party', emoji: '🌙', name: 'Une soirée pyjama', cost: 100 },
];

export async function ensureDefaultRewards(familyId) {
  const rewardsRef = collection(db, 'families', familyId, 'rewards');
  const snapshot = await getDocs(rewardsRef);
  const batch = writeBatch(db);
  if (!snapshot.empty) {
    let migratedCount = 0;
    snapshot.docs.forEach((rewardDoc) => {
      const data = rewardDoc.data();
      const preset = DEFAULT_REWARDS.find((reward) => reward.id === rewardDoc.id);
      const changes = {};
      if (!data.emoji) changes.emoji = preset?.emoji ?? '🎁';
      if (typeof data.active !== 'boolean') changes.active = true;
      if (Object.keys(changes).length > 0) {
        batch.update(doc(rewardsRef, rewardDoc.id), changes);
        migratedCount += 1;
      }
    });
    if (migratedCount > 0) await batch.commit();
    return migratedCount > 0;
  }
  DEFAULT_REWARDS.forEach((reward) => {
    batch.set(doc(rewardsRef, reward.id), { name: reward.name, cost: reward.cost, emoji: reward.emoji, active: true, createdAt: serverTimestamp() });
  });
  await batch.commit();
  return true;
}

export async function createReward(familyId, { name, cost, emoji = '🎁' }) {
  const ref = await addDoc(collection(db, 'families', familyId, 'rewards'), {
    name,
    cost,
    emoji,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReward(familyId, rewardId, changes) {
  await updateDoc(doc(db, 'families', familyId, 'rewards', rewardId), changes);
}

export async function fetchRewards(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'rewards'));
  return snapshot.docs.map((d) => ({ emoji: '🎁', active: true, id: d.id, ...d.data() }));
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
