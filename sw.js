// Barcode-Kasse: hält die App offline verfügbar.
// Bei einer neuen Version die Nummer erhöhen, dann holt das iPad die Dateien neu.
const CACHE = 'barcode-kasse-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Cache antworten (schnell, auch ohne Netz), im Hintergrund aktualisieren.
function cacheFirst(e, key) {
  return caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key || e.request, { ignoreSearch: true });
    const net = fetch(e.request)
      .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(key || e.request, res.clone()); return res; })
      .catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) { e.respondWith(cacheFirst(e, './index.html')); return; }
  if (url.origin === location.origin || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(e));
  }
});
