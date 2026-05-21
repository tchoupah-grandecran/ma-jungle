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

// ── SÉCURISATION DU MESSAGING ──
// On crée une variable modifiable. Elle restera à null si le navigateur ne supporte pas FCM.
export let messaging = null;

// On teste la compatibilité de manière asynchrone sans bloquer l'export
isSupported().then((supported) => {
  if (supported && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  } else {
    console.warn("FCM Messaging non supporté sur ce navigateur (attente du mode PWA écran d'accueil).");
  }
}).catch((err) => {
  console.error("Erreur lors de la vérification du support de l'API Messaging:", err);
});

export default app;