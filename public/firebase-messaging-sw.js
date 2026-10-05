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
// sea quien construya la notificación y controle de forma fiable el clic en Android.
const getReservationId = (payload = {}) => {
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  return String(
    data.reservationId || data.reservaId || data.eventoId || data.eventId ||
    data.requestId || data.id || notification.reservationId || ''
  ).trim();
};

const buildTargetUrl = (payload = {}) => {
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  const reservationId = getReservationId(payload);
  const title = String(data.title || notification.title || '').trim();
  const body = String(data.body || notification.body || '').trim();
  const suppliedUrl = data.url || data.link || data.click_action || notification.click_action || '';
  try {
    const url = new URL(suppliedUrl || CRM_URL, CRM_URL);
    if (reservationId) url.searchParams.set('reservationId', reservationId);
    url.searchParams.set('fromNotification', '1');
    if (title) url.searchParams.set('notificationTitle', title);
    if (body) url.searchParams.set('notificationBody', body);
    return url.href;
  } catch (_) {
    const params = new URLSearchParams({ fromNotification: '1' });
    if (reservationId) params.set('reservationId', reservationId);
    if (title) params.set('notificationTitle', title);
    if (body) params.set('notificationBody', body);
    return `${CRM_URL}?${params.toString()}`;
  }
};

messaging.onBackgroundMessage((payload) => {
  const data = payload?.data || {};
  const notification = payload?.notification || {};
  const reservationId = getReservationId(payload);
  const title = data.title || notification.title || '🎉 Nueva reserva Diverty';
  const body = data.body || notification.body || 'Tienes una nueva reserva.';
  const targetUrl = buildTargetUrl(payload);

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
  const reservationId = String(data.reservationId || data.reservaId || data.eventoId || data.eventId || data.requestId || data.id || '').trim();
  let targetUrl = data.url || CRM_URL;
  try {
    const url = new URL(targetUrl, CRM_URL);
    if (reservationId) url.searchParams.set('reservationId', reservationId);
    url.searchParams.set('fromNotification', '1');
    targetUrl = url.href;
  } catch (_) {
    targetUrl = reservationId ? `${CRM_URL}?reservationId=${encodeURIComponent(reservationId)}&fromNotification=1` : `${CRM_URL}?fromNotification=1`;
  }

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
