importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD0j9E3X0CiDDEVH0G0b8eT18aBlqC0Oj0",
  authDomain: "ma-jungle.firebaseapp.com",
  projectId: "ma-jungle",
  storageBucket: "ma-jungle.firebasestorage.app",
  messagingSenderId: "814758200797",
  appId: "1:814758200797:web:a3a2a5d78d166c0275a234"
});

const messaging = firebase.messaging();

// Le SDK Firebase affiche automatiquement la bannière système en arrière-plan.
// On utilise cet écouteur uniquement pour le suivi ou le débogage.
messaging.onBackgroundMessage((payload) => {
  console.log("Notification reçue en arrière-plan et affichée par Firebase :", payload);
});
