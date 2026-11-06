// Move classification, accuracy and game review (chess.com-style categories, Lichess accuracy formula).
import { Chess } from "chess.js";
import { ANA, scoreOf } from "./engine.js";
import { isBook, loadEco } from "./eco.js";

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// win chance (0..100) for WHITE from a white-POV score object {cp, mate}
export function winW(e) {
  if (!e) return 50;
  if (e.mate != null) return e.mate > 0 ? 100 : 0;
  const cp = Math.max(-2000, Math.min(2000, e.cp));
  if (Math.abs(cp) >= 90000) return cp > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
export const winFor = (e, color) => (color === "w" ? winW(e) : 100 - winW(e));

export function moveAccuracy(lossPct) {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, lossPct)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export function gameAccuracy(accs) {
  if (!accs.length) return null;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harm = accs.length / accs.reduce((a, b) => a + 1 / Math.max(b, 5), 0);
  return Math.round(((mean + harm) / 2) * 10) / 10;
}

// rough performance estimate from accuracy (calibrated loosely on public chess.com/lichess data)
export function ratingFromAccuracy(acc, nMoves) {
  if (acc == null || nMoves < 8) return null;
  const pts = [[30, 200], [50, 450], [60, 750], [70, 1150], [77, 1500], [82, 1800], [86, 2050], [90, 2350], [94, 2700], [97, 3000]];
  let r = pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [a0, r0] = pts[i - 1], [a1, r1] = pts[i];
    if (acc <= a1) { r = r0 + ((acc - a0) / (a1 - a0)) * (r1 - r0); break; }
    r = r1;
  }
  if (acc < 30) r = 100 + acc * 3;
  // short games are noisy: pull towards 1200
  if (nMoves < 15) r = r * 0.6 + 1200 * 0.4;
  return Math.round(r / 50) * 50;
}

export const fmtEval = (e) => {
  if (!e) return "";
  if (e.mate != null) return (e.mate > 0 ? "+" : "-") + "M" + Math.abs(e.mate);
  if (Math.abs(e.cp) >= 90000) return e.cp > 0 ? "1-0" : "0-1";
  const v = e.cp / 100;
  return (v > 0 ? "+" : "") + v.toFixed(Math.abs(v) >= 10 ? 0 : 1);
};

export function material(chess) {
  let w = 0, b = 0;
  for (const row of chess.board()) for (const p of row) if (p) { if (p.color === "w") w += VAL[p.type]; else b += VAL[p.type]; }
  return { w, b };
}

// Did this move leave the moved piece en prise in a way that loses material if taken? (sacrifice detector)
export function isSacrifice(fenBefore, uci) {
  const c = new Chess(fenBefore);
  let m;
  try { m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return false; }
  const piece = m.promotion || m.piece;
  const v = VAL[piece];
  if (v < 3) return false;
  const gained = m.captured ? VAL[m.captured] : 0;
  const opp = c.turn();
  const att = c.attackers(m.to, opp);
  if (!att.length) {
    // the moved piece is safe; maybe it unpinned/left another piece hanging on purpose — check the biggest hanging piece
    return hangingLoss(c, m.color) - gained >= 3;
  }
  const minAtt = Math.min(...att.map((s) => VAL[c.get(s).type] || 99));
  const defended = c.attackers(m.to, m.color).length > 0;
  const net = defended ? gained - v + minAtt : gained - v;
  return net <= -2;
}

// value of the most valuable piece of `color` that is attacked and undefended / attacked by a cheaper piece
export function hangingLoss(c, color) {
  let worst = 0;
  const opp = color === "w" ? "b" : "w";
  const b = c.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f];
    if (!p || p.color !== color || p.type === "k") continue;
    const sq = "abcdefgh"[f] + (8 - r);
    const att = c.attackers(sq, opp);
    if (!att.length) continue;
    const minAtt = Math.min(...att.map((s) => VAL[c.get(s).type] || 99));
    const def = c.attackers(sq, color).length;
    const loss = def ? Math.max(0, VAL[p.type] - minAtt) : VAL[p.type];
    worst = Math.max(worst, loss);
  }
  return worst;
}

export const uciOf = (m) => m.from + m.to + (m.promotion || "");

export function sanOf(fen, uci) {
  try { const c = new Chess(fen); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; }
}
export function pvSan(fen, pv, max = 8) {
  const c = new Chess(fen), out = [];
  for (const u of pv.slice(0, max)) { try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  return out;
}

// Terminal positions get an exact evaluation instead of an engine call.
function terminalEval(c) {
  if (c.isCheckmate()) return { cp: c.turn() === "w" ? -100000 : 100000, mate: null, score: c.turn() === "w" ? -100000 : 100000, terminal: true };
  if (c.isDraw() || c.isStalemate()) return { cp: 0, mate: null, score: 0, terminal: true };
  return null;
}

export async function evalPosition(fen, { depth = 14, movetime = 2500, multipv = 2, signal } = {}) {
  const c = new Chess(fen);
  const t = terminalEval(c);
  if (t) return { lines: [], top: t, terminal: true };
  const r = await ANA.analyse(fen, { depth, movetime, multipv, signal });
  const top = r.lines[0] || { cp: 0, mate: null, move: r.best, pv: [r.best] };
  return { lines: r.lines, top, best: r.best || top.move };
}

// classify one move given analysed before/after positions
export function classify({ fenBefore, uci, color, before, after, prevCls, legalCount, ply, prevCaptureTo }) {
  const bestE = before.top;
  const wBest = winFor(bestE, color);
  const wAfter = winFor(after.top, color);
  const isBest = uci === (before.best || bestE.move);
  let loss = isBest ? 0 : Math.max(0, wBest - wAfter);
  // engine noise: if the played move is the 2nd line and scores about the same, treat its own line value
  if (!isBest && before.lines[1] && before.lines[1].move === uci) loss = Math.max(0, wBest - winFor(before.lines[1], color));
  const acc = moveAccuracy(loss);
  const fenAfter = after.fen;
  let cls;
  if (legalCount === 1) cls = "forced";
  else if (ply < 26 && fenAfter && isBook(fenAfter) && loss < 8) cls = "book";
  else if (isBest || loss < 1) cls = "best";
  else if (loss < 3) cls = "excellent";
  else if (loss < 7) cls = "good";
  else if (loss < 12) cls = "inaccuracy";
  else if (loss < 22) cls = "mistake";
  else cls = "blunder";

  // missed a mate or a big chance the opponent just handed over
  if ((cls === "mistake" || cls === "blunder" || cls === "inaccuracy") && (prevCls === "mistake" || prevCls === "blunder") && wAfter >= 30 && loss >= 10) cls = "miss";
  if ((cls === "inaccuracy" || cls === "mistake" || cls === "blunder") && bestE.mate != null && (color === "w" ? bestE.mate > 0 : bestE.mate < 0) && wAfter > 50) cls = "miss";

  if (cls === "best" && legalCount > 1) {
    // brilliant: a sound piece sacrifice that keeps a good position
    if (wAfter >= 50 && wBest < 98 && isSacrifice(fenBefore, uci)) cls = "brilliant";
    else if (before.lines[1]) {
      // great: the only move that keeps the result; alternatives drop a lot
      const w2 = winFor(before.lines[1], color);
      const recapture = !!prevCaptureTo && uci.slice(2, 4) === prevCaptureTo;
      if (wBest - w2 >= 18 && wBest >= 30 && !recapture && wBest < 97) cls = "great";
    }
  }
  return { cls, loss, acc, wBest, wAfter };
}

// game phase at a position: endgame once little material is left, opening for the first 20 plies
export function phaseAt(fen, ply) {
  const c = new Chess(fen); let np = 0, q = 0;
  for (const row of c.board()) for (const p of row) if (p && p.type !== "k" && p.type !== "p") { np += VAL[p.type]; if (p.type === "q") q++; }
  if (np <= 26 || (q === 0 && np <= 32)) return "endgame";
  return ply < 20 ? "opening" : "middlegame";
}

// Full review of a game. moves: SAN list. Returns plies with classification.
export async function reviewGame(moves, startFen, { depth = 14, onProgress, signal } = {}) {
  await loadEco().catch(() => {});
  const c = new Chess(startFen || undefined);
  const fens = [c.fen()];
  const ucis = [], sans = [], legal = [], colors = [], capTo = [];
  for (const san of moves) {
    legal.push(c.moves().length);
    colors.push(c.turn());
    const m = c.move(san);
    ucis.push(uciOf(m)); sans.push(m.san); capTo.push(m.captured ? m.to : null);
    fens.push(c.fen());
  }
  const evals = [];
  for (let i = 0; i < fens.length; i++) {
    if (signal && signal.aborted) throw new DOMException("aborted", "AbortError");
    const e = await evalPosition(fens[i], { depth, multipv: 2, signal });
    e.fen = fens[i];
    evals.push(e);
    onProgress && onProgress((i + 1) / fens.length, evals);
  }
  const plies = [];
  let prevCls = null;
  for (let i = 0; i < moves.length; i++) {
    const before = evals[i], after = evals[i + 1];
    const r = classify({ fenBefore: fens[i], uci: ucis[i], color: colors[i], before, after, prevCls, legalCount: legal[i], ply: i, prevCaptureTo: i ? capTo[i - 1] : null });
    const bestUci = before.best || (before.top && before.top.move);
    plies.push({
      i, san: sans[i], uci: ucis[i], color: colors[i], fenBefore: fens[i], fenAfter: fens[i + 1],
      evalAfter: after.top, evalBefore: before.top, best: bestUci, bestSan: bestUci ? sanOf(fens[i], bestUci) : null,
      bestPv: before.top && before.top.pv ? before.top.pv : [], replyPv: after.top && after.top.pv ? after.top.pv : [],
      ...r,
    });
    prevCls = r.cls;
  }
  // phase of every ply, and accuracy per phase for each side
  for (const p of plies) p.phase = phaseAt(p.fenBefore, p.i);
  const phases = { w: {}, b: {} };
  for (const col of ["w", "b"]) for (const ph of ["opening", "middlegame", "endgame"]) {
    const a = plies.filter((p) => p.color === col && p.phase === ph && p.cls !== "forced").map((p) => (p.cls === "book" ? 100 : p.acc));
    phases[col][ph] = a.length >= 2 ? gameAccuracy(a) : null;
  }
  const accW = gameAccuracy(plies.filter((p) => p.color === "w" && p.cls !== "book" && p.cls !== "forced").map((p) => p.acc));
  const accB = gameAccuracy(plies.filter((p) => p.color === "b" && p.cls !== "book" && p.cls !== "forced").map((p) => p.acc));
  const counts = { w: {}, b: {} };
  for (const p of plies) counts[p.color][p.cls] = (counts[p.color][p.cls] || 0) + 1;
  const real = (c) => plies.filter((p) => p.color === c && p.cls !== "book" && p.cls !== "forced").length;
  const nW = real("w"), nB = real("b");
  return {
    plies, fens, evals: evals.map((e) => e.top), accW, accB, counts, phases,
    ratingW: ratingFromAccuracy(accW, nW), ratingB: ratingFromAccuracy(accB, nB),
    depth,
  };
}

// Play a SAN move, tolerating over-disambiguated notation like "Ncb4" when only one knight can go there.
export function moveSan(chess, san) {
  try { return chess.move(san); } catch {}
  const clean = String(san).replace(/[!?]+$/, "");
  const m = clean.match(/^([NBRQK])([a-h]?[1-8]?)(x?[a-h][1-8].*)$/);
  if (m) { try { return chess.move(m[1] + m[3]); } catch {} }
  try { return chess.move(clean); } catch {}
  throw new Error("Invalid move: " + san);
}
