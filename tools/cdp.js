// Headless browser test harness (Chrome DevTools Protocol, no deps).
// Usage: node tools/cdp.js <steps.js>   — steps.js exports async (t) => {...}
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..", "docs");
const SHOTS = process.env.SHOTS || path.join(__dirname, "..", "..", "noir-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

(async () => {
  await new Promise((r) => server.listen(8787, r));
  const prof = path.join(require("os").tmpdir(), "noir-cdp-" + Date.now());
  const ch = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", "--no-first-run", "--disable-gpu", "--user-data-dir=" + prof, "--window-size=390,844", "--autoplay-policy=user-gesture-required", "about:blank"], { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 50; i++) { try { ver = await (await fetch("http://127.0.0.1:9333/json/list")).json(); if (ver.length) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
  const page = ver.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = {}; const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.type + ": " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") logs.push("LOG: " + m.params.entry.text + " " + (m.params.entry.url || ""));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  const W = +(process.env.W || 390), H = +(process.env.H || 844);
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: W < 900 });
  if (W < 900) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const t = {
    base: "http://127.0.0.1:8787/",
    async go(url) { await send("Page.navigate", { url: url.startsWith("http") ? url : this.base + url }); await this.wait(800); },
    async eval(expr) { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) return "ERR " + (r.result.exceptionDetails.exception || {}).description; return r.result.result.value; },
    async shot(name) { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(SHOTS, name + ".png"), Buffer.from(r.result.data, "base64")); console.log("shot", name); },
    async fullshot(name) { const m = await send("Page.getLayoutMetrics"); const h = Math.ceil(m.result.cssContentSize.height); await send("Emulation.setDeviceMetricsOverride", { width: W, height: Math.min(h, 4000), deviceScaleFactor: 1, mobile: W < 900 }); await this.wait(300); await this.shot(name); await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: W < 900 }); },
    async click(sel) { return this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return "no "+${JSON.stringify(sel)}; e.click(); return "ok"})()`); },
    async tap(x, y) { for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, pointerType: "mouse" }); },
    async sqXY(sq, sel = ".board") { return this.eval(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); const flip=document.querySelector(${JSON.stringify(sel)}).__flip; return [b.left,b.top,b.width]})()`); },
    async move(from, to, orient = "w", sel = "#bd") {
      const [l, tp, w] = await this.eval(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.left,b.top,b.width]})()`);
      const xy = (s) => { let f = "abcdefgh".indexOf(s[0]), r = +s[1] - 1; if (orient === "b") { f = 7 - f; r = 7 - r; } return [l + (f + 0.5) * w / 8, tp + (7 - r + 0.5) * w / 8]; };
      const [a, b] = xy(from), [c, d] = xy(to);
      await this.tap(a, b); await this.wait(80); await this.tap(c, d);
    },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    logs, send,
  };
  try { await require(path.resolve(process.argv[2]))(t); }
  catch (e) { console.log("STEP ERROR", e); }
  console.log("---- console ----\n" + logs.filter((l) => !/^(log|debug|info): /.test(l)).join("\n"));
  ws.close(); ch.kill(); server.close();
  setTimeout(() => process.exit(0), 300);
})();
