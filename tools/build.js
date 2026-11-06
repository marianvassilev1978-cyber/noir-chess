// Build: bundle src -> docs/ (served by GitHub Pages and published as the Claude artifact).
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs");
const V = Date.now().toString(36);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const a = path.join(src, f), b = path.join(dst, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(ROOT, "src/main.js")],
    bundle: true, minify: true, format: "iife", target: ["safari15", "chrome100"],
    outfile: path.join(OUT, "app.js"), sourcemap: false, legalComments: "none",
    loader: { ".css": "css", ".woff2": "file" }, external: ["fonts/*"],
  });
  // esbuild emits app.css next to app.js because main.js imports styles.css
  copyDir(path.join(ROOT, "public"), OUT);
  copyDir(path.join(ROOT, "content"), path.join(OUT, "content"));
  // content files the app does not need at runtime
  const logo = fs.readFileSync(path.join(ROOT, "tools/logo.svg"), "utf8").replace(/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" /, "<svg ");
  fs.writeFileSync(path.join(OUT, "index.html"), fs.readFileSync(path.join(ROOT, "src/index.html"), "utf8").replace(/__V__/g, V).replace("__LOGO__", logo).replace("<title>", `<script>window.NOIR_BUILD="${V}"</script><title>`));
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({
    name: "Noir Chess", short_name: "Noir Chess", description: "Personal chess trainer: bots, coaches, review, puzzles, openings.",
    start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
    background_color: "#0b0b0d", theme_color: "#0b0b0d",
    icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  }, null, 1));
  const list = [];
  (function walk(d, rel) { for (const f of fs.readdirSync(d)) { const a = path.join(d, f), r = rel ? rel + "/" + f : f; if (fs.statSync(a).isDirectory()) walk(a, r); else list.push(r); } })(OUT, "");
  const precache = list.filter((f) => !/sf-asm\.js$|^sound\/piano|^sound\/sfx|\.md$|\.txt$/.test(f) && !/^pieces\/(?!cburnett|staunty|maestro)/.test(f));
  fs.writeFileSync(path.join(OUT, "sw.js"), `// Offline cache. Version ${V}.
const VERSION = "noir-${V}";
const CORE = ${JSON.stringify(["./", ...precache.filter((f) => f !== "sw.js")])};
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // the page and app code: network first, so updates arrive on the next open; offline falls back to cache
  if (e.request.mode === "navigate" || /\\/(index\\.html|app\\.js|app\\.css|sw\\.js)?$/.test(u.pathname) || u.pathname.includes("/content/")) {
    e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html"))));
    return;
  }
  // stale-while-revalidate for the big static files (engine, pieces, sounds)
  e.respondWith(caches.open(VERSION).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit || c.match("index.html"));
    return hit || net;
  })));
});
`);
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
  const size = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + "KB";
  console.log("built", V, "app.js", size("app.js"), "app.css", size("app.css"), "files", list.length + 2);
})().catch((e) => { console.error(e); process.exit(1); });
