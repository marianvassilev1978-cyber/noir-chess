// Offline cache. Version mw12oxdr.
const VERSION = "noir-mw12oxdr";
const CORE = ["./","app.css","app.js","content/course-endgames.json","content/course-strategy.json","content/course-tactics.json","content/drills-endgame.json","content/eco.json","content/gambits.json","content/lessons.json","content/openings-extra.json","content/openings.json","content/puzzles.json","content/repertoire.json","icon-180.png","icon-192.png","icon-512.png","index.html","manifest.json","pieces/cburnett/bB.svg","pieces/cburnett/bK.svg","pieces/cburnett/bN.svg","pieces/cburnett/bP.svg","pieces/cburnett/bQ.svg","pieces/cburnett/bR.svg","pieces/cburnett/wB.svg","pieces/cburnett/wK.svg","pieces/cburnett/wN.svg","pieces/cburnett/wP.svg","pieces/cburnett/wQ.svg","pieces/cburnett/wR.svg","pieces/maestro/bB.svg","pieces/maestro/bK.svg","pieces/maestro/bN.svg","pieces/maestro/bP.svg","pieces/maestro/bQ.svg","pieces/maestro/bR.svg","pieces/maestro/wB.svg","pieces/maestro/wK.svg","pieces/maestro/wN.svg","pieces/maestro/wP.svg","pieces/maestro/wQ.svg","pieces/maestro/wR.svg","pieces/staunty/bB.svg","pieces/staunty/bK.svg","pieces/staunty/bN.svg","pieces/staunty/bP.svg","pieces/staunty/bQ.svg","pieces/staunty/bR.svg","pieces/staunty/wB.svg","pieces/staunty/wK.svg","pieces/staunty/wN.svg","pieces/staunty/wP.svg","pieces/staunty/wQ.svg","pieces/staunty/wR.svg","sf.js","sf.wasm"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // stale-while-revalidate for everything same-origin
  e.respondWith(caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit || c.match("index.html"));
    return hit || net;
  })));
});
