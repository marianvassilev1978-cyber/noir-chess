// Plain-English coaching from engine data: what a move does, what it allows, what was better.
import { Chess } from "chess.js";
import { VAL, hangingLoss, pvSan, winFor, fmtEval } from "./analysis.js";
import { state } from "./store.js";

const NAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const pl = (n, w) => n + " " + w + (n === 1 ? "" : "s");

function apply(fen, uci) {
  const c = new Chess(fen);
  const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return { c, m };
}

function matDiff(c, color) {
  let w = 0, b = 0;
  for (const row of c.board()) for (const p of row) if (p) { if (p.color === "w") w += VAL[p.type]; else b += VAL[p.type]; }
  return color === "w" ? w - b : b - w;
}

// What does this move do, in a few words?
export function describe(fen, uci) {
  let r; try { r = apply(fen, uci); } catch { return ""; }
  const { c, m } = r;
  const bits = [];
  if (m.flags.includes("k") || m.flags.includes("q")) bits.push("castles the king to safety");
  else if (m.captured) bits.push(`takes the ${NAME[m.captured]} on ${m.to}`);
  else if (m.promotion) bits.push(`promotes to a ${NAME[m.promotion]}`);
  else if (m.piece === "p") bits.push(`pushes the pawn to ${m.to}`);
  else {
    const backRank = m.color === "w" ? "1" : "8";
    if ((m.piece === "n" || m.piece === "b") && m.from[1] === backRank) bits.push(`develops the ${NAME[m.piece]}`);
    else bits.push(`moves the ${NAME[m.piece]} to ${m.to}`);
  }
  if (c.isCheckmate()) bits.push("and it is checkmate");
  else if (c.inCheck()) bits.push("with check");
  // forks: the moved piece attacks 2+ valuable targets
  const targets = attackedBy(c, m.to).filter((s) => { const p = c.get(s); return p && p.color !== m.color && (VAL[p.type] > VAL[m.promotion || m.piece] || p.type === "k" || !c.attackers(s, p.color).length); });
  if (targets.length >= 2) bits.push(`and attacks ${targets.map((s) => (c.get(s).type === "k" ? "the king" : "the " + NAME[c.get(s).type] + " on " + s)).join(" and ")} at once (a fork)`);
  return bits.join(" ");
}

// squares attacked by the piece on sq (pseudo: we flip turn and ask chess.js which moves it has)
function attackedBy(c, sq) {
  const p = c.get(sq); if (!p) return [];
  const out = [];
  for (const f of "abcdefgh") for (let r = 1; r <= 8; r++) {
    const t = f + r;
    if (t === sq) continue;
    const q = c.get(t);
    if (!q || q.color === p.color) continue;
    if (c.attackers(t, p.color).includes(sq)) out.push(t);
  }
  return out;
}

// Evaluate the material swing along a PV: how much does `color` gain in the next n plies?
function pvSwing(fen, pv, color, n = 5) {
  const c = new Chess(fen);
  const start = matDiff(c, color);
  let best = 0, steps = 0;
  for (const u of pv.slice(0, n)) {
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    steps++;
    // only count after the opponent has had the chance to recapture (even ply counts from start)
    if (steps % 2 === 0 || steps === pv.length) best = matDiff(c, color) - start;
  }
  return best;
}

// Explanation for a reviewed ply (from analysis.reviewGame)
export function explainPly(p) {
  const you = p.color;
  const opp = you === "w" ? "b" : "w";
  const out = [];
  const did = describe(p.fenBefore, p.uci);
  const label = { brilliant: "Brilliant!", great: "Great move!", best: "Best move.", excellent: "Excellent.", good: "Good.", book: "Book move.", inaccuracy: "Inaccuracy.", mistake: "Mistake.", miss: "Missed chance.", blunder: "Blunder.", forced: "Only move." }[p.cls];
  out.push(`**${p.san}** ${label ? "— " + label : ""} ${did ? cap(did) + "." : ""}`);

  const bestSan = p.bestSan;
  const after = p.evalAfter, before = p.evalBefore;
  if (p.cls === "brilliant") out.push("You give up material, but the engine confirms it works: the attack or the follow-up is worth more than the piece.");
  if (p.cls === "great") out.push("This was the only good move here — every other move would have thrown away a big part of your advantage.");
  if (p.cls === "book") out.push("A standard opening move played by strong players.");

  if (["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls)) {
    // what does the played move allow?
    const reply = p.replyPv || [];
    if (after && after.mate != null && (opp === "w" ? after.mate > 0 : after.mate < 0)) {
      out.push(`It allows **mate in ${Math.abs(after.mate)}**: ${pvSan(p.fenAfter, reply, Math.abs(after.mate) * 2 - 1).join(" ")}.`);
    } else {
      const lose = -pvSwing(p.fenAfter, reply, you, 5);
      if (lose >= 1 && reply.length) {
        const r = pvSan(p.fenAfter, reply, 4);
        out.push(`It allows **${r[0]}**${r.length > 1 ? " (" + r.join(" ") + ")" : ""} and you lose about ${pl(Math.round(lose), "point")} of material.`);
      } else {
        try {
          const c = new Chess(p.fenAfter);
          const h = hangingLoss(c, you);
          if (h >= 3) out.push(`It leaves a piece undefended.`);
        } catch {}
      }
    }
    if (bestSan) {
      const bestDid = describe(p.fenBefore, p.best);
      const gain = pvSwing(p.fenBefore, p.bestPv || [p.best], you, 5);
      let why = "";
      if (before && before.mate != null && (you === "w" ? before.mate > 0 : before.mate < 0)) why = ` — it forces **mate in ${Math.abs(before.mate)}**: ${pvSan(p.fenBefore, p.bestPv, Math.abs(before.mate) * 2 - 1).join(" ")}`;
      else if (gain >= 1) why = ` — it wins about ${pl(Math.round(gain), "point")} of material (${pvSan(p.fenBefore, p.bestPv, 5).join(" ")})`;
      else if (bestDid) why = ` — it ${bestDid}`;
      out.push(`Better was **${bestSan}**${why}.`);
    }
    if (p.cls === "miss") out.push("Your opponent had just made a mistake, and this move let them off the hook. After an opponent's error, always look for checks, captures and threats first.");
  } else if (p.cls === "excellent" || p.cls === "good") {
    if (bestSan && bestSan !== p.san) out.push(`The engine slightly preferred **${bestSan}**${(() => { const d = describe(p.fenBefore, p.best); return d ? ", which " + d : ""; })()}.`);
  }
  out.push(`Evaluation: ${fmtEval(before)} → ${fmtEval(after)} (your winning chances ${Math.round(p.wBest)}% → ${Math.round(p.wAfter)}%).`);
  return out.join("\n\n");
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Short live-coach line during a game (after the student's move)
export function liveLine(p) {
  const msg = {
    brilliant: "Brilliant! A sacrifice that works.",
    great: "Great move — the only good one.",
    best: "Best move.",
    excellent: "Excellent move.",
    good: "Good move.",
    book: "Book move.",
    forced: "Only move.",
    inaccuracy: "Inaccuracy.",
    mistake: "Mistake.",
    miss: "Missed a chance.",
    blunder: "Blunder!",
  }[p.cls];
  let extra = "";
  if (["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls)) {
    const full = explainPly(p).split("\n\n");
    extra = full.slice(1, 3).join(" ");
  } else if (p.cls === "brilliant" || p.cls === "great") extra = cap(describe(p.fenBefore, p.uci)) + ".";
  return { title: msg, text: extra };
}

// ---------- Ask Claude (inside the Claude artifact) ----------
let sampleFn = null;
export async function initClaude() {
  try { if (window.claude && window.claude.use) sampleFn = await window.claude.use("sample"); } catch { sampleFn = null; }
  document.body.classList.toggle("has-claude", !!sampleFn);
  return !!sampleFn;
}
export const hasClaude = () => !!sampleFn;

export function coachSystem() {
  const s = state();
  const r = s.ratings.rapid.r || s.ratings.blitz.r || (s.placement && s.placement.rating) || "unrated";
  return `You are the personal chess coach inside a private training app. Your student is a teenager working hard to reach 2000 (current rating about ${r}). English is his second language: use short, plain sentences. Be direct and concrete, no flattery. Use the engine data you are given as the truth; never invent moves. Explain the idea behind moves (what it attacks, defends, threatens, or allows), name squares and pieces, and give one practical rule he can reuse. Keep answers under 180 words unless asked for more. Use **bold** for moves.`;
}

export async function askClaude(messages, { onText, signal } = {}) {
  if (!sampleFn) throw Object.assign(new Error("no claude"), { code: "not_granted" });
  const sys = coachSystem();
  const msgs = messages.map((m, i) => (i === 0 ? { role: m.role, content: sys + "\n\n" + m.content } : m));
  const r = await sampleFn(msgs, { onText, signal, cache: false });
  return r.text;
}

export function plyContext(p, gameMoves) {
  return `Game so far (SAN): ${gameMoves.slice(0, p.i + 1).join(" ")}
Position before the move (FEN): ${p.fenBefore}
Student played: ${p.san} (${p.color === "w" ? "White" : "Black"}). Classification: ${p.cls}.
Engine best: ${p.bestSan} with line ${pvSan(p.fenBefore, p.bestPv || [], 8).join(" ")}.
Engine reply after the student's move: ${pvSan(p.fenAfter, p.replyPv || [], 8).join(" ")}.
Evaluation before: ${fmtEval(p.evalBefore)}, after: ${fmtEval(p.evalAfter)} (White's point of view).`;
}
