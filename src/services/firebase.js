import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD0j9E3X0CiDDEVH0G0b8eT18aBlqC0Oj0",
  authDomain: "ma-jungle.firebaseapp.com",
  projectId: "ma-jungle",
  storageBucket: "ma-jungle.firebasestorage.app",
  messagingSenderId: "814758200797",
  appId: "1:814758200797:web:a3a2a5d78d166c0275a234"
};

// Initialisation de l'instance Firebase
const app = initializeApp(firebaseConfig);

// Export des services de base (sécurisés)
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let messagingPromise;

/**
 * Retourne l'instance FCM une fois la détection de compatibilité terminée.
 * Une Promise évite la course entre le premier rendu React et isSupported().
 */
export function getMessagingService() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !(await isSupported())
      ) {
        return null;
      }

      return getMessaging(app);
    })().catch((error) => {
      console.error(
        'Erreur lors de l’initialisation de Firebase Messaging :',
        error,
      );
      return null;
    });
  }

  return messagingPromise;
}

export default app;
