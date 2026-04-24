importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0",
  authDomain: "diverty-eventos.firebaseapp.com",
  projectId: "diverty-eventos",
  storageBucket: "diverty-eventos.firebasestorage.app",
  messagingSenderId: "491130670516",
  appId: "1:491130670516:web:8c80abd09ccc92c194f6e1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || "Diverty Eventos";
  
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
