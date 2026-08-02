import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../shared/firebaseConfig.js';
import { hashPin } from '../shared/pin.js';
import { DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

export async function findFamilyByParent(parentUid) {
  const q = query(collection(db, 'families'), where('parentUid', '==', parentUid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const familyDoc = snapshot.docs[0];
  return { id: familyDoc.id, ...familyDoc.data() };
}

export async function createFamily({ parentUid, parentEmail, childName, pin }) {
  const familyRef = doc(collection(db, 'families'));
  await setDoc(familyRef, {
    parentUid,
    parentEmail,
    createdAt: serverTimestamp(),
  });
  const pinHash = await hashPin(pin);
  await setDoc(doc(db, 'families', familyRef.id, 'pairing', 'data'), {
    childName,
    pinHash,
  });
  await setDoc(doc(db, 'families', familyRef.id, 'profile', 'data'), {
    childName,
    xp: 0,
    avatarLevel: 1,
    badges: [],
    streakDays: 0,
    lastSessionDate: null,
    difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
  });
  return familyRef.id;
}

export async function fetchProfile(familyId) {
  const snapshot = await getDoc(doc(db, 'families', familyId, 'profile', 'data'));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function fetchSessions(familyId) {
  const snapshot = await getDocs(collection(db, 'families', familyId, 'sessions'));
  return snapshot.docs.map((d) => d.data()).sort((a, b) => (a.date < b.date ? 1 : -1));
}
