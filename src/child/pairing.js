import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const CHILD_ID_KEY = 'missionsDeLuna.childId';

export function getStoredChildId(storage = window.localStorage) {
  return storage.getItem(CHILD_ID_KEY);
}

export function storeChildId(childId, storage = window.localStorage) {
  storage.setItem(CHILD_ID_KEY, childId);
}

export function clearStoredChildId(storage = window.localStorage) {
  storage.removeItem(CHILD_ID_KEY);
}

export async function resolvePairingCode(db, pairingCode) {
  const normalizedCode = pairingCode.trim().toUpperCase();
  const snapshot = await getDoc(doc(db, 'pairingCodes', normalizedCode));
  if (!snapshot.exists()) return null;
  return snapshot.data().childId ?? null;
}

// Sans serveur payant, l'appairage est validé explicitement par le parent.
// La tablette ne lit jamais le profil ni un secret avant cette approbation.
export async function requestPairing(db, childId, deviceUid) {
  const requestRef = doc(db, 'children', childId, 'pairingRequests', deviceUid);
  try {
    await setDoc(requestRef, {
      requesterUid: deviceUid,
      status: 'pending',
      requestedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err?.code === 'permission-denied') {
      return { success: false, reason: 'unknown-child' };
    }
    throw err;
  }
  return { success: true, status: 'pending' };
}

export async function pairingStatus(db, childId, deviceUid) {
  const snapshot = await getDoc(doc(db, 'children', childId, 'pairingRequests', deviceUid));
  if (!snapshot.exists()) return 'missing';
  return snapshot.data().status ?? 'pending';
}
