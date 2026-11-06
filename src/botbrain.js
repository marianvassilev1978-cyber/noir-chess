// Bot move selection. Pure logic (chess.js only, no DOM), so tools/calibrate.mjs runs the same code in Node.
// Strength: a search budget (nodes), MultiPV candidates, a softmax temperature over centipawn loss and a small
// chance of an outright oversight, all derived from one number (the bot's internal "skill", calibrated per bot).
// Style: candidates are re-weighted by what they do (checks, captures, king attacks, solid moves, traps).
import { Chess } from "chess.js";

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// skill → engine/noise parameters (continuous)
export function strength(skill) {
  const s = clamp(skill, 0, 3300);
  if (s >= 3150) return { full: true, multipv: 1, nodes: 2_000_000, T: 0, pBlunder: 0, pMate: 1, styleW: 0 };
  return {
    full: false,
    nodes: Math.round(clamp(120 * Math.pow(10, (s - 100) / 880), 60, 1_200_000)),
    multipv: s < 1900 ? 6 : s < 2500 ? 4 : s < 2900 ? 3 : 2,
    T: Math.max(2.5, 300 * Math.exp(-(s - 100) / 560)), // centipawns
    pBlunder: 0.34 * Math.exp(-(s - 100) / 330),
    pMate: clamp(0.45 + s / 1400, 0, 1),
    styleW: clamp(1.15 - s / 3600, 0.3, 1),
  };
}

// ---------- move features (for styles) ----------
function kingSq(c, color) { for (const row of c.board()) for (const p of row) if (p && p.type === "k" && p.color === color) return p.square; return null; }
const dist = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1]));
function attackedValue(c, sq, byColor) {
  // value of the most valuable enemy piece that the piece on sq attacks
  let best = 0;
  const p = c.get(sq); if (!p) return 0;
  for (const f of "abcdefgh") for (let r = 1; r <= 8; r++) {
    const t = f + r, q = c.get(t);
    if (!q || q.color === byColor || q.type === "k") continue;
    if (c.attackers(t, byColor).includes(sq)) best = Math.max(best, VAL[q.type]);
  }
  return best;
}
export function features(fen, uci) {
  const c = new Chess(fen);
  const me = c.turn(), opp = me === "w" ? "b" : "w";
  let m;
  try { m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; }
  const ek = kingSq(c, opp), mk = kingSq(c, me);
  const f = {
    check: c.inCheck(), mate: c.isCheckmate(), capture: m.captured ? VAL[m.captured] : 0, piece: m.piece,
    castle: m.flags.includes("k") || m.flags.includes("q"), promo: !!m.promotion,
    toKing: ek ? dist(m.from, ek) - dist(m.to, ek) : 0, // >0 = moved closer to the enemy king
    pawnStorm: m.piece === "p" && ek && Math.abs(m.to.charCodeAt(0) - ek.charCodeAt(0)) <= 2 && dist(m.to, ek) <= 4,
    shieldPush: m.piece === "p" && mk && Math.abs(m.from.charCodeAt(0) - mk.charCodeAt(0)) <= 1 && dist(m.from, mk) <= 2,
    retreat: (me === "w" ? +m.to[1] < +m.from[1] : +m.to[1] > +m.from[1]),
    develop: (m.piece === "n" || m.piece === "b") && m.from[1] === (me === "w" ? "1" : "8"),
    threat: attackedValue(c, m.to, me),
    hanging: c.attackers(m.to, opp).length > 0 && c.attackers(m.to, me).length === 0 && m.piece !== "p" ? VAL[m.promotion || m.piece] : 0,
    queenEarly: m.piece === "q" && c.moveNumber() < 8,
  };
  return f;
}

// centipawn bonus a style gives a candidate
export function styleBonus(style, f, ply) {
  if (!f) return 0;
  let b = 0;
  switch (style) {
    case "aggressive":
      if (f.check) b += 28; if (f.capture) b += 10 + f.capture * 3; if (f.toKing > 0) b += 8 * f.toKing; if (f.pawnStorm) b += 16; if (f.threat >= 3) b += 10; if (f.retreat) b -= 12; if (f.castle) b -= 6;
      break;
    case "positional":
      if (f.develop) b += 14; if (f.castle) b += 22; if (f.shieldPush) b -= 18; if (f.retreat && !f.capture) b += 2; if (f.queenEarly) b -= 20; if (f.check && !f.mate) b -= 4;
      break;
    case "trickster":
      if (f.threat >= 3) b += 18 + f.threat * 2; if (f.check) b += 14; if (f.capture) b += 4; if (f.hanging >= 3) b += 6; // bait
      break;
    case "defensive":
      if (f.castle) b += 26; if (f.retreat) b += 10; if (f.shieldPush) b -= 24; if (f.pawnStorm) b -= 10; if (f.capture) b += 4; if (f.check) b -= 4; if (f.queenEarly) b -= 18;
      break;
    case "chaotic":
      if (f.queenEarly) b += 30; if (f.capture) b += 14; if (f.check) b += 20;
      break;
    default: break;
  }
  if (ply < 16 && f.develop) b += 6;
  return b;
}

// ---------- opening book from the course data ----------
// book: [{side, moves:[san...], dubious:[bool...]}]; returns SAN or null
export function bookMove(bot, history, color, book, rng = Math.random, forced = null) {
  if (history.length > 24) return null;
  const pools = forced ? [forced] : (book || []).filter((l) => l.side === color);
  const fits = pools.filter((l) => l.moves.length > history.length && history.every((m, i) => l.moves[i] === m) && !(l.dubious && l.dubious[history.length] && !forced));
  if (!fits.length) return null;
  // the longer, main lines are preferred
  const w = fits.map((l) => (l.type === "main" ? 3 : l.type === "trap" ? 1 : 2) + l.moves.length / 20);
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < fits.length; i++) { r -= w[i]; if (r <= 0) return fits[i].moves[history.length]; }
  return fits[0].moves[history.length];
}

// ---------- the choice ----------
const MATE = 100000;
function moverScore(l, turn) {
  let v = l.score;
  if (v == null) v = l.mate != null ? (l.mate > 0 ? MATE - l.mate * 10 : -MATE - l.mate * 10) : l.cp;
  v = turn === "w" ? v : -v;
  return clamp(v, -1600, 1600);
}

// lines: engine MultiPV lines (white-POV score). Returns {uci, why}
export function chooseMove({ bot, fen, lines, ply = 0, rng = Math.random }) {
  const S = strength(bot.skill ?? bot.elo);
  const c = new Chess(fen);
  const turn = c.turn();
  const legal = c.moves({ verbose: true });
  if (!legal.length) return { uci: null, why: "none" };
  if (!lines || !lines.length) { const m = legal[Math.floor(rng() * legal.length)]; return { uci: m.from + m.to + (m.promotion || ""), why: "random" }; }
  if (S.full || lines.length === 1) return { uci: lines[0].move, why: "best" };
  const top = lines[0];
  const mateIn = top.mate != null ? (turn === "w" ? top.mate : -top.mate) : null;
  if (mateIn === 1 && rng() < S.pMate) return { uci: top.move, why: "mate" };
  // an oversight: a plausible-looking legal move (captures and checks are what weak players see first)
  if (rng() < S.pBlunder) {
    const loud = legal.filter((m) => m.captured || m.san.includes("+"));
    const pool = loud.length && rng() < 0.55 ? loud : legal;
    const m = pool[Math.floor(rng() * pool.length)];
    return { uci: m.from + m.to + (m.promotion || ""), why: "oversight" };
  }
  const cands = lines.map((l) => ({ move: l.move, v: moverScore(l, turn) }));
  const best = cands[0].v;
  const weights = cands.map((cd) => {
    const loss = Math.max(0, best - cd.v);
    let bonus = 0;
    if (bot.style && bot.style !== "engine" && loss < 90 + S.T) bonus = styleBonus(bot.style, features(fen, cd.move), ply) * S.styleW;
    return Math.exp(-Math.max(0, loss - bonus) / S.T);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rng() * sum;
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return { uci: cands[i].move, why: i ? "style/noise" : "best" }; }
  return { uci: cands[0].move, why: "best" };
}

// How long a bot "thinks": depends on the clock, the bot's strength and how complex the position is.
export function thinkTime({ bot, fen, lines, clock, ply, rng = Math.random }) {
  const c = new Chess(fen);
  const n = c.moves().length;
  // complexity: many legal moves, several close candidates, tension (captures available)
  let spread = 1;
  if (lines && lines.length > 1) { const t = c.turn(); const v = lines.map((l) => moverScore(l, t)); spread = Math.min(1.6, 0.6 + (lines.filter((_, i) => v[0] - v[i] < 40).length / lines.length)); }
  const caps = c.moves({ verbose: true }).filter((m) => m.captured).length;
  const complexity = Math.min(2.2, (0.55 + n / 45) * spread * (caps ? 1.15 : 1));
  const skill = bot.skill ?? bot.elo;
  const care = 0.7 + Math.min(0.8, skill / 3000);
  if (!clock || clock.ms == null) return Math.round((450 + 900 * complexity * care) * (0.7 + rng() * 0.6));
  const t = clock.ms, inc = clock.inc || 0;
  let base = (t / 32 + inc * 0.75) * complexity * care;
  if (ply < 10) base = Math.min(base * 0.25, 1500);
  if (n === 1) base = 250;
  base *= 0.65 + rng() * 0.7;
  return Math.round(Math.max(180, Math.min(base, t * 0.12, 15000)));
}
