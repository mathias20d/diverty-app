const CRM_URL = 'https://diverty-app.vercel.app/';
const DEFAULT_ICON = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';

// IMPORTANTE: registrar el click ANTES de cargar Firebase.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification?.data || {};
  const fcmMessage = notificationData.FCM_MSG || {};
  const messageData = fcmMessage.data || {};
  const fcmOptions = fcmMessage.fcmOptions || fcmMessage.webpush?.fcmOptions || {};

  const reservationId = String(
    notificationData.reservationId || messageData.reservationId || ''
  ).trim();

  const targetUrl =
    notificationData.url ||
    messageData.url ||
    fcmOptions.link ||
    (reservationId
      ? `${CRM_URL}?reservationId=${encodeURIComponent(reservationId)}`
      : CRM_URL);

  event.waitUntil((async () => {
    const absoluteTarget = new URL(targetUrl, self.location.origin).href;
    const target = new URL(absoluteTarget);
    const clientList = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of clientList) {
      try {
        const current = new URL(client.url);
        if (current.origin === target.origin) {
          if ('navigate' in client) await client.navigate(absoluteTarget);
          return client.focus();
        }
      } catch (_) {}
    }

    return clients.openWindow(absoluteTarget);
  })());
});

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDxE2E1KMuZU523k8oWHabi1jDrFxPOD-0",
  authDomain: "diverty-eventos.firebaseapp.com",
  projectId: "diverty-eventos",
  storageBucket: "diverty-eventos.firebasestorage.app",
  messagingSenderId: "491130670516",
  appId: "1:491130670516:web:8c80abd09ccc92c194f6e1"
});

firebase.messaging();
