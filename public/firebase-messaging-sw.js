// Importar los scripts de Firebase necesarios para Service Workers
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Inicializar Firebase en el Service Worker con tus credenciales exactas
firebase.initializeApp({
  apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0",
  authDomain: "diverty-eventos.firebaseapp.com",
  projectId: "diverty-eventos",
  storageBucket: "diverty-eventos.firebasestorage.app",
  messagingSenderId: "491130670516",
  appId: "1:491130670516:web:8c80abd09ccc92c194f6e1"
});

// Obtener la instancia de mensajería
const messaging = firebase.messaging();

// Escuchar notificaciones cuando la app está en SEGUNDO PLANO (minimizada o cerrada)
messaging.onBackgroundMessage(function(payload) {
  console.log('Mensaje recibido en segundo plano: ', payload);
  
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Notificación";

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "Tienes un nuevo mensaje";

  self.registration.showNotification(title, {
    body: body,
    icon: "/icon-192.png" // Asegúrate de tener un icono válido en tu carpeta public
  });
});
