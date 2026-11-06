// Synthesises original UI sounds (no third-party audio): the achievement chime.
// node tools/make-sounds.cjs  -> public/sound/wood/achievement.wav
const fs = require("fs");
const SR = 44100;
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767, 44 + i * 2));
  return b;
}
function bell(out, t0, f, amp, decay) {
  const s0 = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 1.3 && s0 + i < out.length; i++) {
    const t = i / SR, env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    out[s0 + i] += amp * env * (Math.sin(2 * Math.PI * f * t) + 0.42 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t / (decay * 0.5)) + 0.18 * Math.sin(2 * Math.PI * f * 3.02 * t) * Math.exp(-t / (decay * 0.3)));
  }
}
const out = new Float32Array(Math.floor(SR * 1.4));
[[0, 783.99], [0.075, 987.77], [0.15, 1174.66], [0.235, 1567.98]].forEach(([t, f], i) => bell(out, t, f, 0.22 + i * 0.03, 0.42 + i * 0.12));
for (let k = 0; k < 9; k++) bell(out, 0.3 + k * 0.045, 2600 + Math.random() * 1600, 0.03, 0.12);
let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const g = 0.7 / peak;
fs.writeFileSync(__dirname + "/../public/sound/wood/achievement.wav", wav(Array.from(out, (v) => v * g)));
console.log("achievement.wav written");
