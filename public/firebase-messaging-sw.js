importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0",
  authDomain: "diverty-eventos.firebaseapp.com",
  projectId: "diverty-eventos",
  storageBucket: "diverty-eventos.firebasestorage.app",
  messagingSenderId: "491130670516",
  appId: "1:491130670516:web:8c80abd09ccc92c194f6e1"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Mensaje recibido en segundo plano', payload);
  
  const notificationTitle = payload.notification?.title || 'Diverty Eventos';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes un nuevo mensaje.',
    icon: 'https://i.postimg.cc/GhFd4tcm/1000047880.png', // Tu logo
    badge: 'https://i.postimg.cc/GhFd4tcm/1000047880.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
