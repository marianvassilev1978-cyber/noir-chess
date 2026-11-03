// Offline cache. Version mw159lor.
const VERSION = "noir-mw159lor";
const CORE = ["./","app.css","app.js","content/course-endgames.json","content/course-strategy.json","content/course-tactics.json","content/drills-endgame.json","content/eco.json","content/gambits.json","content/lessons.json","content/openings-extra.json","content/openings.json","content/puzzles.json","content/repertoire.json","icon-180.png","icon-192.png","icon-512.png","index.html","manifest.json","pieces/cburnett/bB.svg","pieces/cburnett/bK.svg","pieces/cburnett/bN.svg","pieces/cburnett/bP.svg","pieces/cburnett/bQ.svg","pieces/cburnett/bR.svg","pieces/cburnett/wB.svg","pieces/cburnett/wK.svg","pieces/cburnett/wN.svg","pieces/cburnett/wP.svg","pieces/cburnett/wQ.svg","pieces/cburnett/wR.svg","pieces/maestro/bB.svg","pieces/maestro/bK.svg","pieces/maestro/bN.svg","pieces/maestro/bP.svg","pieces/maestro/bQ.svg","pieces/maestro/bR.svg","pieces/maestro/wB.svg","pieces/maestro/wK.svg","pieces/maestro/wN.svg","pieces/maestro/wP.svg","pieces/maestro/wQ.svg","pieces/maestro/wR.svg","pieces/staunty/bB.svg","pieces/staunty/bK.svg","pieces/staunty/bN.svg","pieces/staunty/bP.svg","pieces/staunty/bQ.svg","pieces/staunty/bR.svg","pieces/staunty/wB.svg","pieces/staunty/wK.svg","pieces/staunty/wN.svg","pieces/staunty/wP.svg","pieces/staunty/wQ.svg","pieces/staunty/wR.svg","sf.js","sf.wasm","sound/wood/capture1.wav","sound/wood/capture2.wav","sound/wood/capture3.wav","sound/wood/castle.wav","sound/wood/check.wav","sound/wood/correct.wav","sound/wood/draw.wav","sound/wood/lose.wav","sound/wood/lowtime.wav","sound/wood/move1.wav","sound/wood/move2.wav","sound/wood/move3.wav","sound/wood/move4.wav","sound/wood/move5.wav","sound/wood/promote.wav","sound/wood/start.wav","sound/wood/win.wav","sound/wood/wrong.wav"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // the page and app code: network first, so updates arrive on the next open; offline falls back to cache
  if (e.request.mode === "navigate" || /\/(index\.html|app\.js|app\.css|sw\.js)?$/.test(u.pathname) || u.pathname.includes("/content/")) {
    e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
    return;
  }
  // stale-while-revalidate for the big static files (engine, pieces, sounds)
  e.respondWith(caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit || c.match("index.html"));
    return hit || net;
  })));
});
