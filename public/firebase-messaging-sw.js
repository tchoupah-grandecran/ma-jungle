importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD0j9E3X0CiDDEVH0G0b8eT18aBlqC0Oj0",
  authDomain: "ma-jungle.firebaseapp.com",
  projectId: "ma-jungle",
  storageBucket: "ma-jungle.firebasestorage.app",
  messagingSenderId: "814758200797",
  appId: "1:814758200797:web:a3a2a5d78d166c0275a234"
});

const messaging = firebase.messaging();

// RECOMMENDATION : On ne force pas showNotification ici si la 
// notification envoyée par le serveur contient déjà un titre et un corps.
// Firebase s'occupe de tout en arrière-plan.

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Message reçu en arrière-plan :', payload);
  
  // On laisse vide ou on ajoute une logique LOGIQUE UNIQUEMENT.
  // Ne pas appeler self.registration.showNotification() ici 
  // sauf si tu envoies des messages "data-only" sans titre/corps.
});