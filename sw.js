const CACHE = 'shamrani-basma-v25';
const SHELL = [
  './',
  './index.html',
  './app.js?v=25',
  './config.js?v=25',
  './manifest.json',
  './logo-180.png',
  './logo-192.png',
  './logo-512.png',
  './logo-maskable.png',
  './logo-full.png',
  './mark.png',
  './badge-96.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App files: network first so updates arrive at once, cache when offline
  if (url.origin === location.origin) {
    // no-cache: يتأكد من السيرفر كل مرة، فالتحديث يوصل فوراً من غير ما يستنى كاش المتصفح (١٠ دقائق على GitHub)
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
    return;
  }

  // Fonts, the Firebase library and the map library: cache first
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com') || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) || (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('/leaflet/'))) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
  }
});

// Tapping a notification opens the app on the right page (chat, map…)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ go }); return c.focus(); } }
    return self.clients.openWindow('./' + (go ? '#go=' + go : ''));
  }));
});
