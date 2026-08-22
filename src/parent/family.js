import { doc, setDoc, getDoc, getDocs, getDocsFromServer, addDoc, updateDoc, collection, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import {
  DEFAULT_CHARACTER,
  DEFAULT_HAT,
  DEFAULT_CAPE,
  DEFAULT_DECOR,
  DEFAULT_HAIRSTYLE,
  DEFAULT_OUTFIT,
  DEFAULT_COMPANION,
  DEFAULT_COMPANION_ACCESSORY,
  DEFAULT_OWNED_PACK_IDS,
  AVATAR_PACKS,
  configuredAvatarPacks,
} from '../shared/avatarCustomization.js';
import { spendCoins, refundCoins } from '../shared/progression.js';
import { DEFAULT_ENABLED_SUBJECT_IDS, normalizeEnabledSubjects } from '../shared/subjects.js';

// --- Compte parent (une famille = un parent Google, peut avoir plusieurs enfants) ---

async function getDocsFresh(reference) {
  try {
    return await getDocsFromServer(reference);
  } catch (err) {
    // L'application reste utilisable hors ligne si le serveur est inaccessible.
    return getDocs(reference);
  }
}

export async function findFamilyByParent(parentUid) {
  const q = query(collection(db, 'families'), where('parentUid', '==', parentUid));
  const snapshot = await getDocsFresh(q);
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
    badgeCounts: {},
    dailyChallengeDate: null,
    dailyChallengeProgress: 0,
    dailyChallengeCompleted: false,
    dailyChallengeCompletions: 0,
    weeklyGoalCompletions: 0,
    dailyChestDate: null,
    dailyChestCount: 0,
    rareTreasureIds: [],
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
    selectedHairstyle: DEFAULT_HAIRSTYLE,
    selectedOutfit: DEFAULT_OUTFIT,
    selectedCompanion: DEFAULT_COMPANION,
    selectedCompanionAccessory: DEFAULT_COMPANION_ACCESSORY,
    ownedPackIds: DEFAULT_OWNED_PACK_IDS,
    ownedCharacterIds: [],
    focusType: null,
    enabledSubjects: DEFAULT_ENABLED_SUBJECT_IDS,
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
  const snapshot = await getDocsFresh(q);
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

export async function setEnabledSubjects(childId, enabledSubjects) {
  await setDoc(doc(db, 'children', childId), { enabledSubjects: normalizeEnabledSubjects(enabledSubjects) }, { merge: true });
}

export async function setDailyMissionLimit(childId, dailyMissionLimit) {
  await setDoc(doc(db, 'children', childId), { dailyMissionLimit }, { merge: true });
}

export async function creditChildCoins(childId, currentCoins, amount) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) return null;
  const coins = Math.max(0, currentCoins ?? 0) + amount;
  await setDoc(doc(db, 'children', childId), { coins }, { merge: true });
  return coins;
}

export async function fetchSessions(childId) {
  const snapshot = await getDocs(collection(db, 'children', childId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// --- Packs Avatar gérés par le parent ---
// Les visuels restent dans le catalogue versionné ; cette sous-collection ne
// contient que les réglages familiaux. Les nouveaux packs sont ajoutés ici
// automatiquement lors de la prochaine ouverture du tableau de bord.
export async function ensureAvatarPackSettings(familyId) {
  const packsRef = collection(db, 'families', familyId, 'avatarPacks');
  const snapshot = await getDocs(packsRef);
  const existingIds = new Set(snapshot.docs.map((packDoc) => packDoc.id));
  const missing = AVATAR_PACKS.filter((pack) => !existingIds.has(pack.id));
  if (!missing.length) return false;
  const batch = writeBatch(db);
  missing.forEach((pack) => {
    batch.set(doc(packsRef, pack.id), {
      active: true,
      cost: pack.cost,
      requiredLevel: pack.requiredLevel,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return true;
}

export async function fetchAvatarPackSettings(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'avatarPacks'));
  const settings = snapshot.docs.map((packDoc) => ({ id: packDoc.id, ...packDoc.data() }));
  return configuredAvatarPacks(settings);
}

export async function updateAvatarPackSetting(familyId, packId, changes) {
  const allowed = {};
  if (typeof changes.active === 'boolean') allowed.active = changes.active;
  if (Number.isInteger(changes.cost) && changes.cost >= 0) allowed.cost = changes.cost;
  if (Number.isInteger(changes.requiredLevel) && changes.requiredLevel >= 1) allowed.requiredLevel = changes.requiredLevel;
  if (!Object.keys(allowed).length) return false;
  await setDoc(doc(db, 'families', familyId, 'avatarPacks', packId), allowed, { merge: true });
  return true;
}

// --- Cadeaux et privilèges ---
// Le catalogue est partagé par famille ; les demandes restent propres à
// chaque enfant. Les catégories rendent la boutique plus facile à parcourir.

export const DEFAULT_REWARDS = [
  { id: 'sticker-surprise', emoji: '🌟', name: 'Une planche de stickers', cost: 30, category: 'surprise' },
  { id: 'temporary-tattoo', emoji: '🦋', name: 'Un tatouage temporaire', cost: 40, category: 'surprise' },
  { id: 'dessert-choice', emoji: '🍰', name: 'Mon dessert préféré', cost: 50, category: 'treat' },
  { id: 'special-snack', emoji: '🍓', name: 'Un goûter spécial', cost: 60, category: 'treat' },
  { id: 'small-surprise', emoji: '❓', name: 'Le contenu secret choisi par le parent', cost: 75, category: 'surprise', mystery: true },
  { id: 'music-choice', emoji: '🎵', name: 'Choisir la musique', cost: 80, category: 'privilege' },
  { id: 'family-game', emoji: '🎲', name: 'Choisir le jeu de société', cost: 100, category: 'privilege' },
  { id: 'screen-time', emoji: '🎮', name: '20 minutes d’écran en plus', cost: 100, category: 'privilege' },
  { id: 'movie-night', emoji: '🎬', name: 'Choisir le film', cost: 100, category: 'privilege' },
  { id: 'meal-choice', emoji: '🍕', name: 'Choisir le repas', cost: 120, category: 'treat' },
  { id: 'baking-time', emoji: '✏️', name: 'Un joli crayon ou une petite fourniture', cost: 150, category: 'surprise' },
  { id: 'parent-activity', emoji: '🎨', name: 'Choisir une activité en famille', cost: 160, category: 'privilege' },
  { id: 'pajama-party', emoji: '🌙', name: 'Une soirée pyjama', cost: 180, category: 'privilege' },
  { id: 'extra-story', emoji: '📖', name: 'Un petit magazine', cost: 250, category: 'treasure' },
  { id: 'park-trip', emoji: '📚', name: 'Un petit livre choisi', cost: 300, category: 'treasure' },
  { id: 'small-toy', emoji: '🧸', name: 'Un petit jouet', cost: 400, category: 'treasure' },
  { id: 'grand-treasure', emoji: '🎁', name: 'Le grand trésor familial', cost: 600, category: 'treasure' },
];

const LEGACY_REWARDS = new Map([
  ['dessert-choice', ['Choisir le dessert', 15]],
  ['music-choice', ['Choisir la musique en voiture', 15]],
  ['family-game', ['Choisir le jeu de société', 20]],
  ['meal-choice', ['Choisir le repas du soir', 25]],
  ['extra-story', ['Une histoire supplémentaire', 25]],
  ['screen-time', ['20 minutes d’écran en plus', 30]],
  ['parent-activity', ['Choisir une activité avec papa ou maman', 35]],
  ['baking-time', ['Faire un gâteau ensemble', 40]],
  ['movie-night', ['Choisir le film de la soirée', 45]],
  ['park-trip', ['Une sortie au parc', 50]],
  ['small-surprise', ['Une petite surprise', 70]],
  ['pajama-party', ['Une soirée pyjama', 100]],
]);

export async function ensureDefaultRewards(familyId) {
  const rewardsRef = collection(db, 'families', familyId, 'rewards');
  const snapshot = await getDocs(rewardsRef);
  const batch = writeBatch(db);
  const existingIds = new Set(snapshot.docs.map((rewardDoc) => rewardDoc.id));
  let changeCount = 0;
  snapshot.docs.forEach((rewardDoc) => {
    const data = rewardDoc.data();
    const preset = DEFAULT_REWARDS.find((reward) => reward.id === rewardDoc.id);
    const changes = {};
    if (!data.emoji) changes.emoji = preset?.emoji ?? '🎁';
    if (typeof data.active !== 'boolean') changes.active = true;
    if (!data.category) changes.category = preset?.category ?? 'surprise';
    if (preset?.mystery === true && typeof data.mystery !== 'boolean') changes.mystery = true;
    const legacy = LEGACY_REWARDS.get(rewardDoc.id);
    if (preset && legacy && data.name === legacy[0] && data.cost === legacy[1]) {
      changes.name = preset.name;
      changes.cost = preset.cost;
      changes.emoji = preset.emoji;
    }
    if (Object.keys(changes).length > 0) {
      batch.update(doc(rewardsRef, rewardDoc.id), changes);
      changeCount += 1;
    }
  });
  DEFAULT_REWARDS.filter((reward) => !existingIds.has(reward.id)).forEach(({ id, ...reward }) => {
    batch.set(doc(rewardsRef, id), { ...reward, active: true, createdAt: serverTimestamp() });
    changeCount += 1;
  });
  if (changeCount === 0) return false;
  await batch.commit();
  return true;
}

export async function createReward(familyId, { name, cost, emoji = '🎁', category = 'surprise', mystery = false }) {
  const ref = await addDoc(collection(db, 'families', familyId, 'rewards'), {
    name,
    cost,
    emoji,
    category,
    mystery,
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
