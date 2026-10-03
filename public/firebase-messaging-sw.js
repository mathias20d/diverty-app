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

const messaging = firebase.messaging();
const CRM_URL = 'https://diverty-app.vercel.app/';
const DEFAULT_ICON = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const title = data.title || '🎉 Nueva reserva Diverty';
  const body = data.body || 'Tienes una nueva reserva.';
  const reservationId = String(data.reservationId || '').trim();
  const targetUrl = data.url || (reservationId
    ? `${CRM_URL}?reservationId=${encodeURIComponent(reservationId)}`
    : CRM_URL);

  return self.registration.showNotification(title, {
    body,
    icon: data.icon || DEFAULT_ICON,
    badge: data.icon || DEFAULT_ICON,
    tag: reservationId ? `diverty-reserva-${reservationId}` : 'diverty-nueva-reserva',
    renotify: true,
    data: {
      url: targetUrl,
      reservationId,
      type: data.type || 'new_reservation'
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification?.data || {};
  const reservationId = String(data.reservationId || '').trim();
  const targetUrl = data.url || (reservationId
    ? `${CRM_URL}?reservationId=${encodeURIComponent(reservationId)}`
    : CRM_URL);

  event.waitUntil((async () => {
    const absoluteTarget = new URL(targetUrl, self.location.origin).href;
    const target = new URL(absoluteTarget);
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

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
