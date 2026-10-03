// Diverty - Firebase Messaging Service Worker
// El clic se controla antes de cargar Firebase para evitar que FCM abra otro origen.

const DEFAULT_ICON = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';

self.addEventListener('notificationclick', (event) => {
  // Evita que otro listener de Firebase procese el mismo clic.
  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }

  event.notification.close();

  const notificationData = event.notification?.data || {};
  const fcmMessage = notificationData.FCM_MSG || {};
  const messageData = fcmMessage.data || {};

  const reservationId = String(
    notificationData.reservationId ||
    messageData.reservationId ||
    ''
  ).trim();

  // SIEMPRE abre el mismo origen donde está instalada esta PWA.
  // Así funciona aunque Vercel cambie el dominio/alias del deployment.
  const targetUrl = reservationId
    ? `${self.location.origin}/?reservationId=${encodeURIComponent(reservationId)}`
    : `${self.location.origin}/`;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windows) {
      try {
        if (new URL(client.url).origin === self.location.origin) {
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return await client.focus();
        }
      } catch (_) {}
    }

    return await clients.openWindow(targetUrl);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0',
  authDomain: 'diverty-eventos.firebaseapp.com',
  projectId: 'diverty-eventos',
  storageBucket: 'diverty-eventos.firebasestorage.app',
  messagingSenderId: '491130670516',
  appId: '1:491130670516:web:8c80abd09ccc92c194f6e1'
});

firebase.messaging();
