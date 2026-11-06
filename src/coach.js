// Coaching from engine facts: what a move does, what it allows, what was better — then voiced by a coach.
// Every move, square and number in an explanation comes from the engine line or the board; nothing is invented.
import { Chess } from "chess.js";
import { VAL, hangingLoss, pvSan, winFor, fmtEval } from "./analysis.js";
import { state } from "./store.js";
import { voice } from "./voices.js";
import { mainCoach } from "./coaches.js";

const NAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const pl = (n, w) => n + " " + w + (n === 1 ? "" : "s");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pick = (a, seed = 0) => (a && a.length ? a[Math.abs(seed) % a.length] : "");

function apply(fen, uci) { const c = new Chess(fen); const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return { c, m }; }
function matDiff(c, color) { let w = 0, b = 0; for (const row of c.board()) for (const p of row) if (p) { if (p.color === "w") w += VAL[p.type]; else b += VAL[p.type]; } return color === "w" ? w - b : b - w; }
function attackedBy(c, sq) {
  const p = c.get(sq); if (!p) return [];
  const out = [];
  for (const f of "abcdefgh") for (let r = 1; r <= 8; r++) { const t = f + r; if (t === sq) continue; const q = c.get(t); if (!q || q.color === p.color) continue; if (c.attackers(t, p.color).includes(sq)) out.push(t); }
  return out;
}

// What does this move do, in a few words?
export function describe(fen, uci) {
  let r; try { r = apply(fen, uci); } catch { return ""; }
  const { c, m } = r;
  const bits = [];
  if (m.flags.includes("k") || m.flags.includes("q")) bits.push("castles the king to safety");
  else if (m.flags.includes("e")) bits.push(`takes the pawn en passant`);
  else if (m.captured) bits.push(`takes the ${NAME[m.captured]} on ${m.to}`);
  else if (m.promotion) bits.push(`promotes to a ${NAME[m.promotion]}`);
  else if (m.piece === "p") bits.push(`pushes the pawn to ${m.to}`);
  else { const back = m.color === "w" ? "1" : "8"; bits.push((m.piece === "n" || m.piece === "b") && m.from[1] === back ? `develops the ${NAME[m.piece]} to ${m.to}` : `moves the ${NAME[m.piece]} to ${m.to}`); }
  if (c.isCheckmate()) bits.push("and it is checkmate");
  else if (c.inCheck()) bits.push("with check");
  const targets = attackedBy(c, m.to).filter((s) => { const p = c.get(s); return p && p.color !== m.color && (VAL[p.type] > VAL[m.promotion || m.piece] || p.type === "k" || !c.attackers(s, p.color).length); });
  if (targets.length >= 2) bits.push(`and attacks ${targets.map((s) => (c.get(s).type === "k" ? "the king" : "the " + NAME[c.get(s).type] + " on " + s)).join(" and ")} at once — a fork`);
  return bits.join(" ");
}
export const isFork = (fen, uci) => / fork/.test(describe(fen, uci));

function pvSwing(fen, pv, color, n = 6) {
  const c = new Chess(fen); const start = matDiff(c, color); let best = 0, steps = 0;
  for (const u of pv.slice(0, n)) { try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; } steps++; if (steps % 2 === 0 || steps === pv.length) best = matDiff(c, color) - start; }
  return best;
}
// the most valuable undefended (or under-defended) piece of `color`
function hangingPiece(c, color) {
  const opp = color === "w" ? "b" : "w"; let worst = null;
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== color || p.type === "k" || p.type === "p") continue;
    const att = c.attackers(p.square, opp); if (!att.length) continue;
    const minAtt = Math.min(...att.map((s) => VAL[c.get(s).type] || 99));
    const def = c.attackers(p.square, color).length;
    const loss = def ? Math.max(0, VAL[p.type] - minAtt) : VAL[p.type];
    if (loss >= 2 && (!worst || loss > worst.loss)) worst = { sq: p.square, type: p.type, loss, by: att.sort((a, b) => VAL[c.get(a).type] - VAL[c.get(b).type])[0] };
  }
  return worst;
}

export function phaseOf(fen, ply) {
  const c = new Chess(fen); let np = 0, q = 0;
  for (const row of c.board()) for (const p of row) if (p && p.type !== "k" && p.type !== "p") { np += VAL[p.type]; if (p.type === "q") q++; }
  if (np <= 26 || (q === 0 && np <= 32)) return "endgame";
  if (ply < 20) return "opening";
  return "middlegame";
}

// ---------- facts for one reviewed ply ----------
export function factsFor(p) {
  const you = p.color, opp = you === "w" ? "b" : "w";
  const f = { did: describe(p.fenBefore, p.uci), phase: phaseOf(p.fenBefore, p.i) };
  if (p.best && p.best !== p.uci) { f.bestDid = describe(p.fenBefore, p.best); f.bestLine = pvSan(p.fenBefore, p.bestPv && p.bestPv.length ? p.bestPv : [p.best], 6); f.gain = pvSwing(p.fenBefore, p.bestPv && p.bestPv.length ? p.bestPv : [p.best], you); f.bestFork = isFork(p.fenBefore, p.best); }
  const after = p.evalAfter, before = p.evalBefore;
  if (after && after.mate != null && (opp === "w" ? after.mate > 0 : after.mate < 0)) f.allowsMate = Math.abs(after.mate);
  if (before && before.mate != null && (you === "w" ? before.mate > 0 : before.mate < 0) && !(after && after.mate != null && (you === "w" ? after.mate > 0 : after.mate < 0))) f.missedMate = Math.abs(before.mate);
  if (p.replyPv && p.replyPv.length) { f.refutation = pvSan(p.fenAfter, p.replyPv, 6); f.lose = -pvSwing(p.fenAfter, p.replyPv, you); f.refFork = isFork(p.fenAfter, p.replyPv[0]); }
  try { const c = new Chess(p.fenAfter); const h = hangingPiece(c, you); if (h) { f.hanging = h; f.hangBy = NAME[c.get(h.by).type]; } } catch {}
  // opening principles (only for the player's own early moves)
  if (f.phase === "opening") {
    try {
      const { m } = apply(p.fenBefore, p.uci);
      const moveNo = Math.floor(p.i / 2) + 1;
      if (m.piece === "q" && moveNo <= 6 && !m.captured) f.principle = "Bringing the queen out this early lets your opponent develop with tempo by attacking her.";
      else if (m.piece === "k" && !m.flags.includes("k") && !m.flags.includes("q")) f.principle = "Moving the king (not castling) in the opening gives up the right to castle and leaves it in the centre.";
      else if (m.piece === "p" && "ah".includes(m.from[0]) && moveNo <= 8) f.principle = "Edge pawn moves in the opening don't fight for the centre or help development.";
    } catch {}
  }
  // the motif: what kind of error (or success) this is
  const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
  if (!bad) f.motif = "good";
  else if (f.allowsMate) f.motif = "allowed-mate";
  else if (f.missedMate) f.motif = "missed-mate";
  else if (f.lose >= 2 && f.hanging) f.motif = "hanging";
  else if (f.lose >= 2) f.motif = "allowed-tactic";
  else if (f.gain >= 2) f.motif = "missed-win";
  else if (f.phase === "endgame") f.motif = "endgame";
  else if (f.principle) f.motif = "opening";
  else f.motif = "positional";
  return f;
}

// ---------- the explanation, voiced by a coach ----------
// lines: 2–3 sentences (walkthrough) or 1 (live). Built only from facts.
export function narrate(p, { coach = mainCoach(), short = false, f = factsFor(p) } = {}) {
  const V = voice(coach.id);
  const seed = p.i * 7 + (p.san || "").length;
  const out = [pick(V[p.cls] || V.good, seed)];
  const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
  if (!bad) {
    if (p.cls === "brilliant" || p.cls === "great") out.push(`**${p.san}** ${f.did}.${f.gain >= 2 ? ` It wins about ${pl(Math.round(f.gain), "point")} of material.` : ""}`);
    else if (!short && f.did && p.cls !== "book") out.push(`**${p.san}** ${f.did}.`);
    if (!short && p.cls === "excellent" && p.bestSan && p.bestSan !== p.san) out.push(`The engine's top choice was **${p.bestSan}**${f.bestDid ? ", which " + f.bestDid : ""}.`);
    return out.join(" ");
  }
  // what went wrong — the concrete fact
  let what = "";
  if (f.allowsMate) what = `**${p.san}** allows mate in ${f.allowsMate}: ${f.refutation.slice(0, Math.min(f.refutation.length, f.allowsMate * 2 - 1)).join(" ")}.`;
  else if (f.missedMate) what = `You had a forced mate in ${f.missedMate} starting with **${p.bestSan}** (${f.bestLine.slice(0, f.missedMate * 2 - 1).join(" ")}).`;
  else if (f.motif === "hanging") what = `**${p.san}** leaves your ${NAME[f.hanging.type]} on ${f.hanging.sq} ${f.hanging.loss >= VAL[f.hanging.type] ? "undefended" : "under-defended"} — ${f.refutation[0]} ${f.refutation[0] && f.refutation[0].includes("x") ? "takes it" : "starts winning it"}, and you lose about ${pl(Math.max(1, Math.round(f.lose)), "point")}.`;
  else if (f.motif === "allowed-tactic") what = `After **${p.san}**, ${f.refutation[0]}${f.refFork ? " forks your pieces" : ""} (${f.refutation.slice(0, 4).join(" ")}) and you lose about ${pl(Math.round(f.lose), "point")} of material.`;
  else if (f.motif === "missed-win") what = `**${p.bestSan}** ${f.bestDid || "was stronger"}${f.bestFork ? "" : ""} and wins about ${pl(Math.round(f.gain), "point")} (${f.bestLine.slice(0, 4).join(" ")}).`;
  else if (f.principle) what = f.principle;
  else what = `**${p.san}** ${f.did}, but the evaluation drops from ${fmtEval(p.evalBefore)} to ${fmtEval(p.evalAfter)}.`;
  out.push(what);
  if (short) return out.join(" ");
  // the better move (unless already said)
  if (p.bestSan && p.bestSan !== p.san && !["missed-win", "missed-mate"].includes(f.motif)) out.push(`Better was **${p.bestSan}**${f.bestDid ? ", which " + f.bestDid : ""}.`);
  if (p.cls === "miss") out.push("Your opponent had just slipped — that was the moment to strike.");
  const tipKey = f.motif === "allowed-tactic" ? "missed-win" : f.motif;
  const tip = V.tip[tipKey] || V.tip.positional;
  if (tip && tip.length) out.push(pick(tip, seed));
  return out.join(" ");
}

// Long-form explanation for the "More" sheet (keeps the old shape: paragraphs)
export function explainPly(p, coach) { return narrate(p, { coach }).replace(/\. (?=[A-Z*])/g, ".\n\n") + `\n\nEvaluation: ${fmtEval(p.evalBefore)} → ${fmtEval(p.evalAfter)} (your winning chances ${Math.round(p.wBest)}% → ${Math.round(p.wAfter)}%).`; }

// Short live-coach line during a casual game: the classification + one sentence
export function liveLine(p) {
  const title = { brilliant: "Brilliant!", great: "Great move", best: "Best move", excellent: "Excellent", good: "Good move", book: "Book move", forced: "Only move", inaccuracy: "Inaccuracy", mistake: "Mistake", miss: "Missed chance", blunder: "Blunder" }[p.cls];
  const coach = mainCoach();
  const full = narrate(p, { coach, short: true });
  const text = full.split(/(?<=[.!?])\s+/).slice(1).join(" ") || full;
  return { title, text };
}

// Narration for each step of a line ("Show me" / "Why is it bad")
export function stepNote(fen, uci) {
  const c = new Chess(fen); const side = c.turn() === "w" ? "White" : "Black";
  const d = describe(fen, uci);
  return d ? `${side} ${d}.` : "";
}
export function lineSummary(fen, pv, color, evalEnd = null) {
  const c = new Chess(fen); const m0 = matDiff(c, color);
  // count material at the last quiet point (not in the middle of an exchange)
  let quiet = 0;
  const line = (pv || []).slice(0, 10);
  for (let i = 0; i < line.length; i++) {
    const u = line[i];
    let m; try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    const nx = line[i + 1]; let nextCap = false;
    if (nx) { try { nextCap = !!new Chess(c.fen()).move({ from: nx.slice(0, 2), to: nx.slice(2, 4), promotion: nx[4] }).captured; } catch {} }
    if (!nextCap) quiet = matDiff(c, color) - m0;
  }
  if (c.isCheckmate()) return c.turn() === color ? "**Checkmate — you lose.**" : "**Checkmate!**";
  let d = quiet;
  if (evalEnd && evalEnd.mate == null && Math.abs(d) >= 2) { const ev = (color === "w" ? 1 : -1) * evalEnd.cp / 100; if (Math.sign(ev) !== Math.sign(d) || Math.abs(ev) < 1) d = 0; }
  if (d > 0) return `At the end you are **${d} point${d > 1 ? "s" : ""} ahead** in material.`;
  if (d < 0) return `At the end you are **${-d} point${d < -1 ? "s" : ""} behind** in material.`;
  return "Material stays level — the difference is activity and king safety.";
}

// ---------- the coach's verdict ----------
const THEME_FOR = { hanging: ["hangingPiece", "Hanging pieces"], "allowed-tactic": ["fork", "Forks"], "missed-win": ["fork", "Forks"], "allowed-mate": ["mateIn2", "Mate in 2"], "missed-mate": ["mateIn2", "Mate in 2"], endgame: ["endgame", "Endgames"], opening: ["opening", "Opening tactics"], positional: ["middlegame", "Middlegame"] };
export function verdict(R, you, coach = mainCoach()) {
  const V = voice(coach.id);
  const mine = R.plies.filter((p) => p.color === you);
  const facts = mine.map((p) => ({ p, f: factsFor(p) }));
  const bad = facts.filter(({ p }) => ["mistake", "blunder", "miss"].includes(p.cls));
  const phase = R.phases ? R.phases[you] : {};
  const strengths = [], fixes = [];
  const brill = mine.filter((p) => p.cls === "brilliant"), great = mine.filter((p) => p.cls === "great");
  if (brill.length) strengths.push(`A brilliant move: **${brill[0].san}** (move ${Math.floor(brill[0].i / 2) + 1}).`);
  if (great.length) strengths.push(`You found ${great.length} only-move${great.length > 1 ? "s" : ""} (${great.slice(0, 3).map((p) => p.san).join(", ")}).`);
  for (const k of ["opening", "middlegame", "endgame"]) if (phase && phase[k] != null && phase[k] >= 85) strengths.push(`Strong ${k}: ${Math.round(phase[k])}% accuracy.`);
  const bl = mine.filter((p) => p.cls === "blunder").length;
  if (!bl && mine.length >= 10) strengths.push("No blunders the whole game.");
  const acc = you === "w" ? R.accW : R.accB;
  if (acc >= 80) strengths.push(`Overall accuracy of ${acc}%.`);
  const goodRuns = mine.filter((p) => ["best", "excellent", "great", "brilliant", "book"].includes(p.cls)).length;
  if (mine.length && strengths.length < 3) strengths.push(`${goodRuns} of your ${mine.length} moves were best, excellent or book.`);
  const book = mine.filter((p) => p.cls === "book").length;
  const bestPhase = phase ? ["opening", "middlegame", "endgame"].filter((k) => phase[k] != null).sort((a, b) => phase[b] - phase[a])[0] : null;
  const fill = [
    book >= 2 ? `You knew your opening: ${book} book moves.` : null,
    bestPhase && phase[bestPhase] >= 70 && !strengths.some((x) => x.includes(bestPhase)) ? `Your best phase was the ${bestPhase} (${Math.round(phase[bestPhase])}%).` : null,
    mine.length >= 25 ? `You fought for ${mine.length} moves — staying in the game matters.` : null,
    "You finished the game and reviewed it — that habit alone gains rating.",
    "You're building pattern memory with every reviewed game.",
  ].filter(Boolean);
  for (const x of fill) if (strengths.length < 3) strengths.push(x);
  // things to fix, grouped by motif
  const byMotif = {};
  for (const x of bad) (byMotif[x.f.motif] = byMotif[x.f.motif] || []).push(x);
  const order = Object.entries(byMotif).sort((a, b) => b[1].length - a[1].length);
  const say = { hanging: (n, xs) => `${n} time${n > 1 ? "s" : ""} a piece was left hanging (${xs.map((x) => x.p.san).join(", ")}).`, "allowed-tactic": (n, xs) => `${n} move${n > 1 ? "s" : ""} allowed a tactic (${xs.map((x) => x.p.san).join(", ")}).`, "missed-win": (n, xs) => `You missed ${n} winning chance${n > 1 ? "s" : ""}: ${xs.map((x) => x.p.bestSan).join(", ")}.`, "allowed-mate": (n) => `You allowed a mating attack ${n > 1 ? n + " times" : "once"}.`, "missed-mate": (n, xs) => `You missed a forced mate (${xs[0].p.bestSan}).`, endgame: (n) => `The endgame cost you (${n} error${n > 1 ? "s" : ""}).`, opening: (n, xs) => xs[0].f.principle || "Opening principles slipped.", positional: (n, xs) => `${n} positional slip${n > 1 ? "s" : ""} (${xs.map((x) => x.p.san).join(", ")}).` };
  for (const [k, xs] of order) if (fixes.length < 3) fixes.push(say[k](xs.length, xs));
  for (const k of ["opening", "middlegame", "endgame"]) if (fixes.length < 3 && phase && phase[k] != null && phase[k] < 70) fixes.push(`Your ${k} accuracy was ${Math.round(phase[k])}%.`);
  const inacc = mine.filter((p) => p.cls === "inaccuracy").length;
  if (fixes.length < 3 && inacc) fixes.push(`${inacc} inaccurac${inacc > 1 ? "ies" : "y"}: small slips add up.`);
  for (const extra of ["Keep your blunder-check: before each move, ask what your opponent threatens.", "Spend your thinking time on the critical moments — captures, checks and big decisions.", "After the game, replay the moments where the evaluation swung and say the better move out loud."]) if (fixes.length < 3) fixes.push(extra);
  // the exercise
  const top = order[0] ? order[0][0] : phase && phase.endgame != null && phase.endgame < 75 ? "endgame" : "missed-win";
  const [theme, themeName] = THEME_FOR[top] || THEME_FOR["missed-win"];
  const exercise = top === "endgame" ? { label: "Endgame Gym: 3 drills", route: "endgames" } : top === "opening" ? { label: "Drill your opening lines", route: "openings/openings" } : { label: `Puzzles: ${themeName} ×10`, route: "puzzle/theme/" + theme };
  return { intro: pick(V.verdict, R.plies.length), strengths: strengths.slice(0, 3), fixes: fixes.slice(0, 3), exercise, tip: pick((V.tip[top] || V.tip.positional), R.plies.length) };
}

// ---------- Ask Claude (inside the Claude artifact only) ----------
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
  const c = mainCoach();
  return `You are ${c.name}, ${c.role}, the personal chess coach inside a training app. Voice: ${c.voice} Your student is working to reach 2000 (rating about ${r}). Use short, plain sentences. Use the engine data you are given as the truth; never invent moves. Explain the idea behind moves and give one practical rule. Under 180 words. Use **bold** for moves.`;
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
