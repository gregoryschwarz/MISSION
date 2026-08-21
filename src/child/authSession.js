import { signInAnonymously } from 'firebase/auth';

// Firebase restaure l'utilisateur persistant de façon asynchrone au démarrage.
// Attendre cette restauration évite de créer un nouvel UID anonyme au refresh,
// ce qui ferait perdre à la tablette son autorisation Firestore existante.
export async function ensureDeviceAuth(auth, signIn = signInAnonymously) {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  if (!auth.currentUser) {
    await signIn(auth);
  }
  return auth.currentUser;
}
