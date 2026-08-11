import { doc, getDoc } from 'firebase/firestore';
import { verifyPin } from '../shared/pin.js';

const CHILD_ID_KEY = 'missionsDeLuna.childId';

export function getStoredChildId(storage = window.localStorage) {
  return storage.getItem(CHILD_ID_KEY);
}

export function storeChildId(childId, storage = window.localStorage) {
  storage.setItem(CHILD_ID_KEY, childId);
}

// Le code d'appairage est directement l'identifiant du document enfant
// (`children/{childId}`) — chaque enfant a son propre code, sa tablette n'est
// appairée qu'à lui (support multi-enfants).
export async function pairWithChild(db, childId, pin) {
  const childRef = doc(db, 'children', childId);
  const snapshot = await getDoc(childRef);
  if (!snapshot.exists()) {
    return { success: false, reason: 'unknown-child' };
  }
  const { pinHash, childName } = snapshot.data();
  const valid = await verifyPin(pin, pinHash);
  if (!valid) {
    return { success: false, reason: 'wrong-pin' };
  }
  return { success: true, childName };
}
