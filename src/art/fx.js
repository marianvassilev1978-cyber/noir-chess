// Big-moment effects: a Kurzgesagt-style burst (stacked glow + impact ring + radial dashes), confetti, haptics.
import { animate, stagger } from "motion";
import confetti from "canvas-confetti";
import { reduced } from "./motion.js";

// Burst centred on an element (or {x,y} in client coordinates).
export function burst(target, { color = "var(--acc)", size = 120, dashes = 12 } = {}) {
  if (reduced()) return;
  let x, y;
  if (target && target.getBoundingClientRect) { const r = target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  else if (target) ({ x, y } = target);
  if (x == null) return;
  const el = document.createElement("div");
  el.className = "fx-burst";
  el.style.cssText = `position:fixed;left:${x - size}px;top:${y - size}px;width:${size * 2}px;height:${size * 2}px;pointer-events:none;z-index:400`;
  let d = "";
  for (let i = 0; i < dashes; i++) {
    const a = (i / dashes) * Math.PI * 2 + Math.random() * 0.3;
    const len = 8 + Math.random() * 14;
    d += `<line class="dash" x1="0" y1="0" x2="${len}" y2="0" stroke="${i % 3 ? color : "#fff"}" stroke-width="${i % 2 ? 3 : 2}" stroke-linecap="round" transform="rotate(${(a * 180) / Math.PI})" data-a="${a}"/>`;
  }
  el.innerHTML = `<svg viewBox="${-size} ${-size} ${size * 2} ${size * 2}" width="100%" height="100%" style="overflow:visible">
    <circle class="g3" r="${size * 0.55}" fill="${color}" opacity=".12"/><circle class="g2" r="${size * 0.32}" fill="${color}" opacity=".22"/><circle class="g1" r="${size * 0.14}" fill="#fff" opacity=".7"/>
    <circle class="ring" r="${size * 0.12}" fill="none" stroke="${color}" stroke-width="3"/><circle class="ring2" r="${size * 0.12}" fill="none" stroke="#fff" stroke-width="1.5"/>${d}</svg>`;
  document.body.appendChild(el);
  const q = (s) => el.querySelectorAll(s);
  animate(q(".g1, .g2, .g3"), { scale: [0.2, 1.15, 1], opacity: [0, 0.8, 0] }, { duration: 0.9, delay: stagger(0.04), ease: "easeOut" });
  animate(q(".ring"), { scale: [1, 4], opacity: [1, 0] }, { duration: 0.75, ease: [0, 0.9, 0.1, 1] });
  animate(q(".ring2"), { scale: [1, 3.2], opacity: [0.9, 0] }, { duration: 0.75, delay: 0.08, ease: [0, 0.9, 0.1, 1] });
  q(".dash").forEach((ln, i) => {
    const a = +ln.dataset.a, dist = size * (0.45 + Math.random() * 0.4);
    animate(ln, { x: [Math.cos(a) * size * 0.12, Math.cos(a) * dist], y: [Math.sin(a) * size * 0.12, Math.sin(a) * dist], opacity: [1, 1, 0] }, { duration: 0.6 + Math.random() * 0.25, delay: i * 0.012, ease: [0.1, 0.9, 0.2, 1] });
  });
  setTimeout(() => el.remove(), 1200);
}

// Confetti for big wins (canvas-confetti, ISC).
export function celebrate({ big = false } = {}) {
  if (reduced()) return;
  const colors = ["#e2b45e", "#f4d58e", "#ffffff", "#3cc97f", "#5fa2ff", "#c38bff"];
  confetti({ particleCount: big ? 140 : 70, spread: big ? 100 : 70, startVelocity: big ? 48 : 38, origin: { y: 0.65 }, colors, ticks: 220, scalar: 0.9, disableForReducedMotion: true });
  if (big) setTimeout(() => { confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }); confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }); }, 250);
}

// Haptics: Vibration API where it exists; on iPhone Safari (18+), toggling a hidden <input switch> plays a light tap.
// (The switch-toggle technique is the one used by the open-source "ios-haptics" project, MIT.)
let hSwitch = null;
export function haptic(kind = "light") {
  try {
    if (navigator.vibrate) { navigator.vibrate(kind === "heavy" ? [18, 40, 18] : kind === "medium" ? 16 : 8); return; }
    if (!hSwitch) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText = "position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none";
      const inp = document.createElement("input");
      inp.type = "checkbox"; inp.setAttribute("switch", "");
      label.appendChild(inp); document.body.appendChild(label);
      hSwitch = label;
    }
    hSwitch.click();
    if (kind === "heavy") setTimeout(() => hSwitch.click(), 90);
  } catch {}
}
