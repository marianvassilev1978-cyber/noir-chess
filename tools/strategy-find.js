// Structural search over Lichess puzzles (no engine). Prints candidates for a named predicate.
const { Chess } = require("./strategy-lib.js");
const P = require("../content/puzzles.json");
const kind = process.argv[2];
const u = (s) => ({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
function pawns(c, color) { const out = []; for (const row of c.board()) for (const sq of row) if (sq && sq.type === "p" && sq.color === color) out.push(sq.square); return out; }
function isolated(c, sq, color) { const f = sq.charCodeAt(0); return !pawns(c, color).some((p) => Math.abs(p.charCodeAt(0) - f) === 1); }
let n = 0;
for (const p of P) {
  const c = new Chess(p[0]); const ms = p[1].split(" ");
  c.move(u(ms[0])); const fen = c.fen();
  const mv = new Chess(fen).move(u(ms[1]));
  const me = c.turn();
  let hit = false;
  if (kind === "iqpbreak") hit = mv.piece === "p" && (mv.from[0] === "d") && isolated(c, mv.from, me) && !mv.captured;
  if (kind === "pawnbreak") hit = mv.piece === "p" && !p[3].includes("mate") && !p[3].includes("promotion") && !p[3].includes("advancedPawn") && !mv.san.includes("+");
  if (kind === "quietpiece") hit = mv.piece !== "p" && mv.piece !== "k" && !mv.captured && !mv.san.includes("+") && !p[3].includes("mate");
  if (kind === "kingmove") hit = mv.piece === "k" && !p[3].includes("mate");
  if (hit) { n++; console.log(JSON.stringify([fen, mv.san, ms.length - 1, p[2], p[3], p[4]])); }
}
console.error(n);
// extra predicates
if (kind === "topawnend") {
  for (const p of P) {
    const c = new Chess(p[0]); const ms = p[1].split(" ");
    c.move(u(ms[0])); const fen = c.fen();
    const mv = c.move(u(ms[1])); if (!mv.captured || ms.length < 3) continue;
    c.move(u(ms[2]));
    const pcs = c.board().flat().filter(Boolean).filter((s) => s.type !== "k" && s.type !== "p");
    if (pcs.length === 0) console.log(JSON.stringify([fen, mv.san, ms.length - 1, p[2], p[3], p[4]]));
  }
}
