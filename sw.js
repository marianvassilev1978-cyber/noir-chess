// Offline cache for the installed app. Bump VERSION on every deploy.
const VERSION = 'noir-mw07pld1';
const CORE = ['./', 'index.html', 'app.js', 'sf.js', 'sf.wasm', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // network-first for the page and app code (so updates arrive), cache-first for the big engine files
  const big = /\.(wasm|png)$/.test(u.pathname) || u.pathname.endsWith('sf.js') || u.pathname.endsWith('sf-asm.js');
  if (big) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const cl = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cl)); return res; })));
  else e.respondWith(fetch(e.request).then(res => { const cl = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cl)); return res; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
