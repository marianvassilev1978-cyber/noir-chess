// Sounds: "wood" is synthesized (no files); "sfx" and "piano" are Lichess sound sets by Enigmahack (AGPLv3+).
import { state } from "./store.js";

let ctx = null;
const buffers = {};
const FILES = { move: "Move", capture: "Capture", check: "Check", castle: "Move", promote: "Check", start: "GenericNotify", notify: "GenericNotify", lowtime: "LowTime", win: "Victory", lose: "Defeat", draw: "Draw", correct: "GenericNotify", wrong: "Capture", select: null };

// iOS: let sounds play even when the ring/silent switch is on (Safari 16.4+). Without this,
// Web Audio is muted by the silent switch.
function setSession() {
  try { if (navigator.audioSession) navigator.audioSession.type = state().settings.soundOnSilent === false ? "ambient" : "playback"; } catch {}
}

function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  return ctx;
}

// iOS only unlocks audio inside a real user activation (touchend / click / keydown — NOT touchstart or a
// touch pointerdown), and older iOS also needs a sound started inside that event. Retry on every tap until running.
let unlocked = false;
function unlock() {
  setSession();
  const c = ac();
  if (!c) return;
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b; s.connect(c.destination); s.start(0);
  } catch {}
  if (c.state === "running") unlocked = true;
}
["touchend", "click", "pointerup", "keydown"].forEach((ev) => window.addEventListener(ev, () => { if (!unlocked || (ctx && ctx.state !== "running")) unlock(); }, { passive: true, capture: true }));
// iOS suspends ("interrupts") the context when the app goes to the background
document.addEventListener("visibilitychange", () => { if (!document.hidden && ctx && ctx.state !== "running") { unlocked = false; ctx.resume().catch(() => {}); } });
export const audioState = () => (ctx ? ctx.state : "not started");
export function testSound() { unlock(); setTimeout(() => play("move"), 40); setTimeout(() => play("capture"), 400); setTimeout(() => play("check"), 800); }

async function buf(set, name) {
  const k = set + "/" + name;
  if (buffers[k] !== undefined) return buffers[k];
  buffers[k] = null;
  try {
    const r = await fetch(`sound/${set}/${name}.mp3`);
    const ab = await r.arrayBuffer();
    buffers[k] = await new Promise((res, rej) => ac().decodeAudioData(ab, res, rej));
  } catch { buffers[k] = null; }
  return buffers[k];
}

function noiseBuffer(c) {
  if (c._noise) return c._noise;
  const b = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (c._noise = b);
}

// a wooden "tock": filtered noise transient + a short low body resonance
function knock(c, t, { freq = 1900, body = 190, gain = 0.6, decay = 0.07 } = {}) {
  const vol = state().settings.volume ?? 0.8;
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
  const g = c.createGain(); g.gain.setValueAtTime(gain * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  n.connect(bp).connect(g).connect(c.destination); n.start(t); n.stop(t + decay + 0.02);
  const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(body * 1.4, t); o.frequency.exponentialRampToValueAtTime(body, t + 0.05);
  const g2 = c.createGain(); g2.gain.setValueAtTime(gain * 0.9 * vol, t); g2.gain.exponentialRampToValueAtTime(0.001, t + decay * 1.6);
  o.connect(g2).connect(c.destination); o.start(t); o.stop(t + decay * 1.6 + 0.02);
}
function tone(c, t, f, dur, type = "sine", gain = 0.18) {
  const vol = state().settings.volume ?? 0.8;
  const o = c.createOscillator(); o.type = type; o.frequency.value = f;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

function synth(name) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + 0.005;
  switch (name) {
    case "move": knock(c, t); break;
    case "capture": knock(c, t, { freq: 2400, body: 150, gain: 0.85, decay: 0.09 }); knock(c, t + 0.045, { freq: 1500, body: 120, gain: 0.45, decay: 0.06 }); break;
    case "castle": knock(c, t); knock(c, t + 0.09, { gain: 0.5 }); break;
    case "check": knock(c, t, { freq: 2600, gain: 0.7 }); tone(c, t + 0.02, 880, 0.22, "triangle", 0.12); break;
    case "promote": knock(c, t); tone(c, t + 0.03, 660, 0.12, "triangle", 0.12); tone(c, t + 0.12, 990, 0.2, "triangle", 0.12); break;
    case "start": case "notify": tone(c, t, 523, 0.18, "triangle"); tone(c, t + 0.12, 784, 0.3, "triangle"); break;
    case "lowtime": tone(c, t, 1200, 0.08, "square", 0.06); tone(c, t + 0.15, 1200, 0.08, "square", 0.06); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.11, f, 0.35, "triangle", 0.14)); break;
    case "lose": [440, 370, 311].forEach((f, i) => tone(c, t + i * 0.16, f, 0.4, "sine", 0.14)); break;
    case "draw": tone(c, t, 523, 0.3, "sine"); tone(c, t + 0.18, 523, 0.3, "sine"); break;
    case "correct": tone(c, t, 784, 0.12, "triangle", 0.14); tone(c, t + 0.09, 1175, 0.22, "triangle", 0.14); break;
    case "wrong": tone(c, t, 196, 0.25, "sawtooth", 0.07); break;
    case "select": knock(c, t, { gain: 0.15, decay: 0.03 }); break;
  }
}

export async function play(name) {
  const s = state().settings;
  if (!s.sound) return;
  if (s.haptics && navigator.vibrate && (name === "capture" || name === "check")) { try { navigator.vibrate(12); } catch {} }
  const set = s.soundSet || "wood";
  if (set === "wood" || !FILES[name]) return synth(name);
  const c = ac(); if (!c) return;
  const b = await buf(set, FILES[name]);
  if (!b) return synth(name);
  const src = c.createBufferSource(); src.buffer = b;
  const g = c.createGain(); g.gain.value = s.volume ?? 0.8;
  src.connect(g).connect(c.destination); src.start();
}

// pick the right sound for a chess.js move object
export function moveSound(m, gameOver) {
  if (gameOver) return;
  if (m.san.includes("+") || m.san.includes("#")) play("check");
  else if (m.flags.includes("k") || m.flags.includes("q")) play("castle");
  else if (m.promotion) play("promote");
  else if (m.captured) play("capture");
  else play("move");
}
