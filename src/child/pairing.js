import { doc, getDoc } from 'firebase/firestore';
import { verifyPin } from '../shared/pin.js';

const FAMILY_ID_KEY = 'missionsDeLuna.familyId';

export function getStoredFamilyId(storage = window.localStorage) {
  return storage.getItem(FAMILY_ID_KEY);
}

export function storeFamilyId(familyId, storage = window.localStorage) {
  storage.setItem(FAMILY_ID_KEY, familyId);
}

export async function pairWithFamily(db, familyId, pin) {
  const pairingRef = doc(db, 'families', familyId, 'pairing', 'data');
  const snapshot = await getDoc(pairingRef);
  if (!snapshot.exists()) {
    return { success: false, reason: 'unknown-family' };
  }
  const { pinHash, childName } = snapshot.data();
  const valid = await verifyPin(pin, pinHash);
  if (!valid) {
    return { success: false, reason: 'wrong-pin' };
  }
  return { success: true, childName };
}
