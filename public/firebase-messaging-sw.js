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

// Gère l'affichage quand l'app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Message reçu en arrière-plan:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png' // Mets ici le chemin vers ton icône
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});