const CACHE_NAME = 'usefull-kiosk-v4-20260714-1';

const APP_SHELL = [
  './',
  './index.html',
  './v3.html',
  './v4.html',
  './core-v3.js',
  './core-v4.js',
  './manifest.webmanifest',
  './manifest-v3.webmanifest',
  './manifest-v4.webmanifest',
  './images/USEFULL-icons/USEFULL-Icon-Registered_Color.svg',
  './images/USEFULL-icons/USEFULL-Logo-Registered_Color.svg',
  './images/USEFULL-icons/icon-180.png',
  './images/USEFULL-icons/icon-192.png',
  './images/USEFULL-icons/icon-512.png',
  './images/college-logos/Northern Arizona University.png',
  './images/college-logos/Pioneer State University.png',
  './images/interface-icons/16oz-cup.png',
  './images/interface-icons/33oz-bowl.png',
  './images/interface-icons/46oz-container.png',
  './images/interface-icons/56oz-bowl.png',
  './images/interface-icons/Usefull-Icons-Golden_1_College.png',
  './images/interface-icons/Usefull-Icons-Golden_1_CreditCard.png',
  './images/interface-icons/Usefull-Icons-Golden_1_Cup.png',
  './images/interface-icons/app-icon.png',
  './images/interface-icons/icon-card.png',
  './images/interface-icons/icon-duedate.png',
  './images/interface-icons/icon-fee.png',
  './images/interface-icons/icon-lost.png',
  './images/interface-icons/settings.png',
  './images/interface-icons/usefull-qr-icon-abstract.png',
  './images/interface-icons/usefull-qr-code.png',
  './images/QR-codes/appdownload-QR.png',
  './images/QR-codes/terms-QR.png',
  './images/illustrations/nfc-tap.png',
  './images/illustrations/concept-art/checkmark-filled-transparent.png',
  './images/illustrations/concept-art/checkout-station-kiosk-scan.gif',
  './images/illustrations/concept-art/checkout-station-kiosk-usefull-icon.png',
  './images/illustrations/concept-art/checkout-station-kiosk.png',
  './images/illustrations/concept-art/nfc_oval_golden.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isHtmlRequest =
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/v3.html') ||
    url.pathname.endsWith('/v4.html');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => (
        cached || caches.match('./v4.html')
      )))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./v4.html');
        }

        return Response.error();
      });
    })
  );
});
