// Motion system for characters and UI. Transforms and opacity only.
// Characters: idle breathing (CSS), blinking every 2–6 s, eye tracking, head tilt, expression cross-fades,
// a talking mouth loop while a bubble types out, celebrate / disappoint reactions, enter / exit.
// UI: spring press feedback, staggered entrances, count-up numbers — built on Motion (motion.dev, MIT).
import { animate, stagger } from "motion";

export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const ctls = new Set();
let ticker = null;
const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => {
  for (const e of es) { const c = e.target.__ctl; if (!c) continue; c.visible = e.isIntersecting; e.target.classList.toggle("paused", !e.isIntersecting); }
}, { rootMargin: "40px" }) : null;

function tick() {
  const now = performance.now();
  for (const c of ctls) {
    if (!c.el.isConnected) { c.destroy(); continue; }
    if (!c.visible || document.hidden || reduced()) continue;
    if (now >= c.nextBlink) {
      c.blink();
      c.nextBlink = now + 1500 + Math.random() * 2600;
      if (Math.random() < 0.18) setTimeout(() => c.blink(), 260); // the occasional double blink
    }
    if (c.idle && now >= c.nextIdle) {
      c.nextIdle = now + 3500 + Math.random() * 5000;
      if (!c.tracking || now - c.tracking > 4000) {
        const r = Math.random();
        if (r < 0.45) c.look((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8);
        else if (r < 0.75) c.look(0, 0);
        else c.tilt((Math.random() - 0.5) * 6);
      }
    }
  }
  if (!ctls.size) { clearInterval(ticker); ticker = null; }
}

// Bring a character to life. el: the .char <svg> or any element containing one.
export function bring(el, { idle = true, enter = false } = {}) {
  const svg = el && (el.classList && el.classList.contains("char") ? el : el.querySelector && el.querySelector(".char"));
  if (!svg) return null;
  if (svg.__ctl) return svg.__ctl;
  const root = svg.querySelector(".c-root");
  let base = svg.dataset.expr || "neutral", holdT = null, talkT = null, poseT = null;
  const c = {
    el: svg, visible: true, idle, tracking: 0,
    nextBlink: performance.now() + 800 + Math.random() * 2500, nextIdle: performance.now() + 2500 + Math.random() * 3000,
    blink() { svg.classList.add("blink"); setTimeout(() => svg.classList.remove("blink"), 105); },
    // expression; hold = ms before returning to the base expression
    expr(e, hold) {
      clearTimeout(holdT);
      svg.dataset.expr = e;
      if (hold) holdT = setTimeout(() => (svg.dataset.expr = base), hold);
      else base = e;
      return c;
    },
    pose(p, hold) { clearTimeout(poseT); svg.dataset.pose = p; if (hold) poseT = setTimeout(() => (svg.dataset.pose = "rest"), hold); return c; },
    talk(on, ms) {
      clearTimeout(talkT);
      svg.classList.toggle("talking", !!on && !reduced());
      if (on && ms) talkT = setTimeout(() => svg.classList.remove("talking"), ms);
      return c;
    },
    // dx, dy in -1..1
    look(dx, dy) {
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      const far = Math.hypot(dx - (c.lx || 0), dy - (c.ly || 0)) > 0.6;
      c.lx = dx; c.ly = dy;
      svg.style.setProperty("--px", (dx * 3.6).toFixed(2) + "px"); svg.style.setProperty("--py", (dy * 2.6).toFixed(2) + "px");
      // a blink often follows a big look change
      if (far && Math.random() < 0.45) { setTimeout(() => c.blink(), 170); c.nextBlink = performance.now() + 2200 + Math.random() * 2000; }
      return c;
    },
    lookAt(x, y) {
      const r = svg.getBoundingClientRect();
      if (!r.width) return c;
      const ex = r.left + r.width * 0.5, ey = r.top + r.height * 0.45;
      const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy) || 1;
      c.tracking = performance.now();
      return c.look(dx / Math.max(d, 60), dy / Math.max(d, 60));
    },
    lookAtEl(t) { if (!t) return c; const r = t.getBoundingClientRect(); return c.lookAt(r.left + r.width / 2, r.top + r.height / 2); },
    tilt(deg) { svg.style.setProperty("--tilt", deg + "deg"); return c; },
    react(kind) {
      if (reduced()) { c.expr(kind === "celebrate" ? "happy" : "worried", 1800); return c; }
      if (kind === "celebrate") {
        c.expr("happy", 2000); c.pose("cheer", 1700);
        animate(root, { y: [0, -14, 0, -8, 0] }, { duration: 0.9, ease: "easeOut" });
      } else if (kind === "impressed") {
        c.expr("impressed", 2200); c.pose("cheer", 1200);
        animate(root, { scale: [1, 1.05, 1] }, { duration: 0.5 });
      } else if (kind === "disappoint") {
        c.expr("worried", 2200);
        svg.style.setProperty("--hy", "5px"); c.tilt(-6);
        animate(root, { x: [0, -3, 3, -2, 2, 0] }, { duration: 0.5 });
        setTimeout(() => { svg.style.setProperty("--hy", "0px"); c.tilt(0); }, 1900);
      } else if (kind === "nod") {
        animate(svg.querySelector(".c-head"), { y: [0, 3, 0, 2, 0] }, { duration: 0.6 });
      } else if (kind === "think") {
        c.expr("thinking", 2600); c.pose("think", 2600); c.look(-0.6, -0.8);
      }
      return c;
    },
    enter() { if (reduced()) return Promise.resolve(); return animate(root, { opacity: [0, 1], y: [26, 0], scale: [0.9, 1] }, { type: "spring", bounce: 0.35, duration: 0.7 }).finished; },
    exit() { if (reduced()) return Promise.resolve(); return animate(root, { opacity: [1, 0], y: [0, 18], scale: [1, 0.94] }, { duration: 0.25 }).finished; },
    destroy() { ctls.delete(c); io && io.unobserve(svg); clearTimeout(holdT); clearTimeout(talkT); clearTimeout(poseT); svg.__ctl = null; },
  };
  svg.__ctl = c;
  svg.classList.add("live");
  ctls.add(c);
  io && io.observe(svg);
  if (!ticker) ticker = setInterval(tick, 120);
  if (enter) c.enter();
  return c;
}

// Bring every character inside a container to life (idempotent).
export function bringAll(root, opts) { const out = []; root.querySelectorAll(".char").forEach((s) => out.push(bring(s, opts))); return out; }

// Type HTML into an element, character by character, keeping tags intact. Returns a promise; ctl talks meanwhile.
export function typeInto(el, html, { cps = 55, ctl = null } = {}) {
  if (el.__typing) el.__typing.cancel();
  if (reduced() || !html) { el.innerHTML = html; return Promise.resolve(); }
  const tokens = String(html).split(/(<[^>]+>|&[a-z#0-9]+;)/i).filter(Boolean);
  let out = "", i = 0, j = 0, done = false, timer;
  el.innerHTML = "";
  ctl && ctl.talk(true);
  return new Promise((res) => {
    const finish = () => { done = true; clearInterval(timer); el.innerHTML = html; ctl && ctl.talk(false); el.__typing = null; res(); };
    el.__typing = { cancel: finish };
    const step = Math.max(1, Math.round(cps / 30));
    timer = setInterval(() => {
      if (done) return;
      for (let k = 0; k < step && i < tokens.length; k++) {
        const t = tokens[i];
        if (t[0] === "<" || t[0] === "&") { out += t; i++; j = 0; k--; continue; }
        out += t[j++];
        if (j >= t.length) { i++; j = 0; }
      }
      el.innerHTML = out;
      if (i >= tokens.length) finish();
    }, 1000 / 30);
    el.addEventListener("click", finish, { once: true });
  });
}

// ---------- UI motion ----------
// Spring press feedback for every button-like element (one global listener).
export function installPress() {
  if (window.__pressInstalled) return;
  window.__pressInstalled = true;
  const SEL = ".btn, .icon-btn, .tile, .chip, .tc-btn, .bot, .card.tap, .lesson-row, .list-row[data-id], .seg button, .tab, .opt, .press";
  let cur = null;
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest && e.target.closest(SEL);
    if (!t || t.disabled || reduced()) return;
    cur = t;
    animate(t, { scale: t.classList.contains("tile") || t.classList.contains("card") ? 0.985 : 0.95 }, { type: "spring", stiffness: 600, damping: 30 });
  }, { passive: true });
  const up = () => { if (!cur) return; const t = cur; cur = null; animate(t, { scale: 1 }, { type: "spring", stiffness: 500, damping: 14 }); };
  document.addEventListener("pointerup", up, { passive: true });
  document.addEventListener("pointercancel", up, { passive: true });
}

// Staggered entrance for a screen's blocks.
export function enterStagger(root, sel = ":scope > *") {
  if (reduced() || !root) return;
  const els = [...root.querySelectorAll(sel)].slice(0, 14);
  if (!els.length) return;
  animate(els, { opacity: [0, 1], y: [14, 0] }, { delay: stagger(0.04), type: "spring", bounce: 0.2, duration: 0.5 });
}

export function popIn(el, delay = 0) { if (!el || reduced()) return; animate(el, { opacity: [0, 1], scale: [0.6, 1] }, { delay, type: "spring", bounce: 0.5, duration: 0.5 }); }
export function slideUp(el, delay = 0) { if (!el || reduced()) return; animate(el, { opacity: [0, 1], y: [24, 0] }, { delay, type: "spring", bounce: 0.25, duration: 0.6 }); }
export function shake(el) { if (!el || reduced()) return; animate(el, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 }); }

// Count a number up (or down) inside an element.
export function countTo(el, from, to, { duration = 0.9, fmt = (v) => Math.round(v) } = {}) {
  if (!el) return;
  if (reduced() || from === to || from == null) { el.textContent = fmt(to); return; }
  animate(from, to, { duration, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => (el.textContent = fmt(v)) });
}

export { animate, stagger };
