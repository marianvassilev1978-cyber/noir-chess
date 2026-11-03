// Sounds via plain <audio> elements (the most reliable path on iPhone: unlocks on a tap and plays
// through the silent switch). "wood" sounds are synthesized in JS into WAV files at startup;
// "sfx" and "piano" are Lichess sound sets by Enigmahack (AGPLv3+).
import { state } from "./store.js";

const NAMES = ["move", "capture", "check", "castle", "promote", "start", "notify", "lowtime", "win", "lose", "draw", "correct", "wrong", "select"];
const FILES = { move: "Move", capture: "Capture", check: "Check", castle: "Move", promote: "Check", start: "GenericNotify", notify: "GenericNotify", lowtime: "LowTime", win: "Victory", lose: "Defeat", draw: "Draw", correct: "GenericNotify", wrong: "Capture", select: "Move" };
const SR = 44100;

// ---------- tiny synth -> WAV ----------
function render(len, fn) {
  const n = Math.floor(SR * len), out = new Float32Array(n);
  fn(out);
  return out;
}
function addKnock(out, t0, { freq = 1900, body = 190, gain = 0.6, decay = 0.07 } = {}) {
  // band-passed noise transient (biquad) + short pitched body
  const w0 = (2 * Math.PI * freq) / SR, q = 1.4, alpha = Math.sin(w0) / (2 * q), cos = Math.cos(w0);
  const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const s0 = Math.floor(t0 * SR), nN = Math.floor((decay + 0.02) * SR), nB = Math.floor((decay * 1.6 + 0.02) * SR);
  for (let i = 0; i < nN && s0 + i < out.length; i++) {
    const x = Math.random() * 2 - 1;
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[s0 + i] += y * 2.2 * gain * Math.exp((-i / SR) * (6.9 / decay));
  }
  let ph = 0;
  for (let i = 0; i < nB && s0 + i < out.length; i++) {
    const t = i / SR;
    const f = body * (1 + 0.4 * Math.exp(-t / 0.02));
    ph += (2 * Math.PI * f) / SR;
    out[s0 + i] += Math.sin(ph) * gain * 0.9 * Math.exp(-t * (6.9 / (decay * 1.6)));
  }
}
function addTone(out, t0, f, dur, type = "sine", gain = 0.18) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR, p = (t * f) % 1;
    let v = type === "sine" ? Math.sin(2 * Math.PI * p) : type === "triangle" ? 1 - 4 * Math.abs(p - 0.5) : type === "square" ? (p < 0.5 ? 1 : -1) : 2 * p - 1;
    const env = Math.min(1, t / 0.012) * Math.exp((-t / dur) * 5);
    out[s0 + i] += v * gain * env * 1.6;
  }
}
const WOOD = {
  move: () => render(0.2, (o) => addKnock(o, 0)),
  capture: () => render(0.25, (o) => { addKnock(o, 0, { freq: 2400, body: 150, gain: 0.85, decay: 0.09 }); addKnock(o, 0.045, { freq: 1500, body: 120, gain: 0.45, decay: 0.06 }); }),
  castle: () => render(0.3, (o) => { addKnock(o, 0); addKnock(o, 0.09, { gain: 0.5 }); }),
  check: () => render(0.35, (o) => { addKnock(o, 0, { freq: 2600, gain: 0.7 }); addTone(o, 0.02, 880, 0.25, "triangle", 0.12); }),
  promote: () => render(0.4, (o) => { addKnock(o, 0); addTone(o, 0.03, 660, 0.12, "triangle", 0.12); addTone(o, 0.12, 990, 0.22, "triangle", 0.12); }),
  start: () => render(0.5, (o) => { addTone(o, 0, 523, 0.18, "triangle"); addTone(o, 0.12, 784, 0.32, "triangle"); }),
  lowtime: () => render(0.3, (o) => { addTone(o, 0, 1200, 0.08, "square", 0.05); addTone(o, 0.15, 1200, 0.08, "square", 0.05); }),
  win: () => render(0.85, (o) => [523, 659, 784, 1047].forEach((f, i) => addTone(o, i * 0.11, f, 0.38, "triangle", 0.14))),
  lose: () => render(0.9, (o) => [440, 370, 311].forEach((f, i) => addTone(o, i * 0.16, f, 0.42, "sine", 0.14))),
  draw: () => render(0.55, (o) => { addTone(o, 0, 523, 0.3, "sine"); addTone(o, 0.18, 523, 0.3, "sine"); }),
  correct: () => render(0.35, (o) => { addTone(o, 0, 784, 0.12, "triangle", 0.14); addTone(o, 0.09, 1175, 0.24, "triangle", 0.14); }),
  wrong: () => render(0.3, (o) => addTone(o, 0, 196, 0.26, "sawtooth", 0.07)),
  select: () => render(0.06, (o) => addKnock(o, 0, { gain: 0.15, decay: 0.03 })),
};
WOOD.notify = WOOD.start;

function wavURL(samples) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

// ---------- pools of <audio> elements ----------
const pools = {}; // key set/name -> [Audio, Audio, Audio]
const woodURLs = {};
function srcFor(set, name) {
  if (set === "wood") { if (!woodURLs[name]) woodURLs[name] = wavURL((WOOD[name] || WOOD.move)()); return woodURLs[name]; }
  return `sound/${set}/${FILES[name]}.mp3`;
}
function pool(set, name) {
  const k = set + "/" + name;
  if (!pools[k]) {
    const url = srcFor(set, name);
    pools[k] = [0, 1, 2].map(() => { const a = new Audio(url); a.preload = "auto"; a.setAttribute("playsinline", ""); return a; });
  }
  return pools[k];
}
const curSet = () => state().settings.soundSet || "wood";

let unlocked = false, lastErr = "";
const primed = new Set();
function unlock() {
  const set = curSet();
  if (primed.has(set)) return;
  primed.add(set);
  unlocked = true;
  for (const n of NAMES) for (const a of pool(set, n)) {
    try {
      a.muted = true;
      const p = a.play();
      if (p && p.then) p.then(() => { lastErr = ""; a.pause(); a.currentTime = 0; a.muted = false; }).catch((e) => { a.muted = false; lastErr = e && e.name; primed.delete(set); });
      else { a.pause(); a.muted = false; }
    } catch (e) { a.muted = false; primed.delete(set); }
  }
}
["touchend", "click", "keydown"].forEach((ev) => window.addEventListener(ev, unlock, { passive: true, capture: true }));

export async function play(name) {
  const s = state().settings;
  if (!s.sound) return;
  if (s.haptics && navigator.vibrate && (name === "capture" || name === "check")) { try { navigator.vibrate(12); } catch {} }
  const p = pool(curSet(), NAMES.includes(name) ? name : "move");
  const a = p.find((x) => x.paused || x.ended) || p[0];
  try {
    a.muted = false;
    a.volume = s.volume ?? 0.8; // ignored on iPhone (hardware volume only)
    a.currentTime = 0;
    const r = a.play();
    if (r && r.catch) r.catch((e) => { lastErr = e && e.name; });
  } catch (e) { lastErr = e && e.name; }
}

export const audioState = () => (lastErr ? "blocked (" + lastErr + ")" : unlocked ? "ready" : "waiting for a tap");
export function testSound() { unlock(); play("move"); setTimeout(() => play("capture"), 350); setTimeout(() => play("check"), 750); }

// pick the right sound for a chess.js move object
export function moveSound(m, gameOver) {
  if (gameOver) return;
  if (m.san.includes("+") || m.san.includes("#")) play("check");
  else if (m.flags.includes("k") || m.flags.includes("q")) play("castle");
  else if (m.promotion) play("promote");
  else if (m.captured) play("capture");
  else play("move");
}
