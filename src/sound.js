// Sound engine.
// Primary: Web Audio — decoded buffers, zero-latency start, many sounds can overlap, no media-session side effects.
// Fallback: pooled <audio> elements — used if Web Audio can't start (or on old iPhones without audioSession,
// where Web Audio is muted by the silent switch).
// "wood": real recordings (Kenney Impact/Interface/Casino sounds, CC0), trimmed, de-clicked and loudness-matched.
// "sfx", "piano": Lichess sound sets by Enigmahack (AGPLv3+).
import { state } from "./store.js";

const WOOD = {
  move: ["move1", "move2", "move3", "move4", "move5"],
  capture: ["capture1", "capture2", "capture3"],
  castle: ["castle"], check: ["check"], promote: ["promote"], start: ["start"], notify: ["start"],
  lowtime: ["lowtime"], win: ["win"], lose: ["lose"], draw: ["draw"], correct: ["correct"], wrong: ["wrong"],
};
const LICHESS = { move: "Move", capture: "Capture", check: "Check", castle: "Move", promote: "Check", start: "GenericNotify", notify: "GenericNotify", lowtime: "LowTime", win: "Victory", lose: "Defeat", draw: "Draw", correct: "GenericNotify", wrong: "Capture" };

const curSet = () => { const s = state().settings.soundSet; return s === "sfx" || s === "piano" ? s : "wood"; };
function urlsFor(set, name) {
  if (set === "wood") return (WOOD[name] || WOOD.move).map((f) => `sound/wood/${f}.wav`);
  return [`sound/${set}/${LICHESS[name] || "Move"}.mp3`];
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
// Old iPhones (no audioSession API) mute Web Audio with the silent switch; <audio> plays through it.
const preferElements = isIOS && !navigator.audioSession;

// ---------------- Web Audio path ----------------
let ctx = null, master = null;
const buffers = new Map(); // url -> AudioBuffer | Promise
function makeCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC({ latencyHint: "interactive" }); } catch { try { ctx = new AC(); } catch { return null; } }
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  return ctx;
}
function setSession() {
  try { if (navigator.audioSession) navigator.audioSession.type = state().settings.soundOnSilent === false ? "ambient" : "playback"; } catch {}
}
function loadBuffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then((ab) => new Promise((res, rej) => { const q = ctx.decodeAudioData(ab, res, rej); if (q && q.then) q.then(res, rej); }))
    .then((b) => { buffers.set(url, b); return b; })
    .catch(() => { buffers.delete(url); return null; });
  buffers.set(url, p);
  return p;
}
function preloadSet(set) {
  if (!ctx) return;
  for (const n of Object.keys(WOOD)) for (const u of urlsFor(set, n)) loadBuffer(u);
}
function webPlay(url, { rate = 1, gain = 1 } = {}) {
  const b = buffers.get(url);
  if (!b || b instanceof Promise) return false;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start(0);
  return true;
}

// ---------------- <audio> fallback ----------------
const pools = new Map();
function elPool(url) {
  if (!pools.has(url)) pools.set(url, [0, 1, 2, 3].map(() => { const a = new Audio(url); a.preload = "auto"; a.setAttribute("playsinline", ""); return a; }));
  return pools.get(url);
}
function elPlay(url, gain = 1) {
  const p = elPool(url);
  const a = p.find((x) => x.paused || x.ended) || p.reduce((o, x) => (x.currentTime > o.currentTime ? x : o), p[0]);
  try {
    a.volume = Math.min(1, gain * (state().settings.volume ?? 0.9));
    if (!a.paused) a.pause();
    a.currentTime = 0;
    const r = a.play();
    if (r && r.catch) r.catch(() => {});
  } catch {}
}

// ---------------- unlock ----------------
let mode = "locked"; // locked | web | element
let lastSet = null;
function unlock() {
  setSession();
  const set = curSet();
  if (!preferElements && makeCtx()) {
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    // a 1-sample silent buffer inside the gesture is what older WebKit needs to really start
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch {}
    if (lastSet !== set) { preloadSet(set); lastSet = set; }
    // decide after the resume settles
    setTimeout(() => { if (ctx && ctx.state === "running") mode = "web"; else if (mode !== "web") primeElements(set); }, 250);
    if (ctx.state === "running") mode = "web";
  } else primeElements(set);
}
let primedSet = null;
function primeElements(set) {
  if (primedSet === set) { mode = "element"; return; }
  primedSet = set;
  for (const n of Object.keys(WOOD)) for (const u of urlsFor(set, n)) for (const a of elPool(u)) {
    try { a.muted = true; const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; primedSet = null; }); } catch { a.muted = false; }
  }
  mode = "element";
}
function needsUnlock() {
  if (mode === "locked") return true;
  if (mode === "web") return !ctx || ctx.state !== "running" || lastSet !== curSet();
  return primedSet !== curSet();
}
const gesture = () => { setSession(); if (needsUnlock()) unlock(); };
["touchend", "click", "keydown", "pointerup"].forEach((ev) => window.addEventListener(ev, gesture, { passive: true, capture: true }));
// iOS suspends/interrupts audio in the background; resume when we're visible again
document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx && ctx.state !== "running") ctx.resume().catch(() => {}); });

// ---------------- public API ----------------
const LEVEL = { start: 0.9, notify: 0.9, win: 1, lose: 1, draw: 1, lowtime: 1, correct: 0.9, wrong: 0.9 };
let lastPick = {};
export function play(name) {
  const s = state().settings;
  if (!s.sound || name === "select") return;
  const set = curSet();
  const list = urlsFor(set, name);
  // never repeat the same variation twice in a row
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastPick[name]) i = (i + 1) % list.length;
  lastPick[name] = i;
  const url = list[i];
  const vol = (s.volume ?? 0.9) * (LEVEL[name] || 1);
  const rate = set === "wood" && (name === "move" || name === "capture") ? 0.97 + Math.random() * 0.06 : 1;
  if (mode === "web" && ctx && ctx.state === "running") {
    if (master) master.gain.value = 1;
    if (webPlay(url, { rate, gain: vol })) { plays.web++; return; }
    // not decoded yet (e.g. right after switching sets): play it as soon as it's ready, if still timely
    const t0 = performance.now();
    Promise.resolve(loadBuffer(url)).then((b) => { if (b && performance.now() - t0 < 600 && webPlay(url, { rate, gain: vol })) plays.web++; });
    return;
  }
  if (mode !== "locked") { elPlay(url, vol); plays.element++; }
}

let plays = { web: 0, element: 0 };
window.__noirSound = () => ({ mode, ctx: ctx && ctx.state, decoded: [...buffers.values()].filter((b) => b && !(b instanceof Promise)).length, plays, set: curSet() });
export function audioState() {
  if (mode === "web") return "ready (Web Audio, " + (ctx ? ctx.state : "?") + ")";
  if (mode === "element") return "ready (audio elements)";
  return "waiting for a tap";
}
export async function testSound() {
  unlock();
  // wait until this set is decoded so the test never plays a half-loaded set
  const set = curSet();
  if (ctx && !preferElements) await Promise.all(Object.keys(WOOD).flatMap((n) => urlsFor(set, n).map((u) => Promise.resolve(loadBuffer(u))))).catch(() => {});
  const seq = ["move", "capture", "check", "castle"];
  seq.forEach((n, i) => setTimeout(() => play(n), 150 + i * 450));
}
// call from a user gesture when the sound set changes, so the new set is ready before the next move
export function preloadCurrent() { unlock(); }

// pick the right sound for a chess.js move object
export function moveSound(m, gameOver) {
  if (gameOver) return;
  if (m.san.includes("+") || m.san.includes("#")) play("check");
  else if (m.flags.includes("k") || m.flags.includes("q")) play("castle");
  else if (m.promotion) play("promote");
  else if (m.captured) play("capture");
  else play("move");
}
