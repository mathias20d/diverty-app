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
const ICON_URL = 'https://i.postimg.cc/GhFd4tcm/1000047880.png';

// IMPORTANTE:
// El Worker de Cloudflare debe enviar un mensaje DATA-ONLY para que este Service Worker
// sea quien construya la notificaciÃ³n y controle de forma fiable el clic en Android.
messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const reservationId = String(data.reservationId || '').trim();
  const title = data.title || 'ðŸŽ‰ Nueva reserva Diverty';
  const body = data.body || 'Tienes una nueva reserva.';
  const targetUrl = data.url || (reservationId
    ? `${CRM_URL}?reservationId=${encodeURIComponent(reservationId)}`
    : CRM_URL);

  return self.registration.showNotification(title, {
    body,
    icon: ICON_URL,
    badge: ICON_URL,
    tag: reservationId ? `diverty-reserva-${reservationId}` : 'diverty-notificacion',
    renotify: false,
    data: {
      url: targetUrl,
      reservationId
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
    const absoluteTarget = new URL(targetUrl, CRM_URL).href;
    const target = new URL(absoluteTarget);
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of clientList) {
      try {
        const current = new URL(client.url);
        if (current.origin === target.origin) {
          if ('navigate' in client) {
            await client.navigate(absoluteTarget);
          }
          await client.focus();
          return;
        }
      } catch (_) {}
    }

    await clients.openWindow(absoluteTarget);
  })());
});
