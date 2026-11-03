// tactics-pool: build candidate exercises from puzzles.json
// usage: node tactics-pool.js "<themes>" minR maxR maxCount [maxStudentMoves] [jsFilter] > out.json
// theme spec: comma = AND, each item may be a|b = OR, prefix ! = NOT, "*" = any
// jsFilter: JS expression over (fen, sol, t, r, pre, sans, start) where sans = solution SAN array
const { Chess } = require("chess.js");
const P = require("../content/puzzles.json");
const [spec, minR, maxR, maxN, maxSM, filt] = process.argv.slice(2);
const conds = spec === "*" ? [] : spec.split(",").map((x) => x.trim());
const used = new Set(JSON.parse(require("fs").readFileSync(__dirname + "/../content/lessons.json", "utf8")).flatMap(l => l.lessons.flatMap(s => s.steps.map(x => x.fen))).filter(Boolean));
const F = filt ? new Function("fen", "sol", "t", "r", "pre", "sans", "start", "Chess", "return (" + filt + ")") : null;
const out = [];
for (const p of P) {
  const [fen, mv, r, th, id] = p;
  const t = (Array.isArray(th) ? th : th.split(" "));
  if (r < +minR || r > +maxR) continue;
  let ok = true;
  for (const c of conds) {
    if (c.startsWith("!")) { if (c.slice(1).split("|").some((x) => t.includes(x))) ok = false; }
    else if (!c.split("|").some((x) => t.includes(x))) ok = false;
  }
  if (!ok) continue;
  const ms = mv.split(" ");
  const ch = new Chess(fen);
  const m0 = ch.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] });
  const start = ch.fen();
  if (used.has(start)) continue;
  const sol = [], movs = [];
  for (const u of ms.slice(1)) { const m = ch.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); sol.push(m.san); movs.push(m); }
  if (Math.ceil(sol.length / 2) > +(maxSM || 5)) continue;
  if (F && !F(start, movs, t, r, m0, sol, new Chess(start), Chess)) continue;
  const goal = t.some((x) => x.startsWith("mateIn")) ? "mate" : undefined;
  out.push({ type: "exercise", fen: start, text: `${id} r${r} [${t.join(" ")}] pre ${m0.san}`, solution: sol, ...(goal ? { goal } : {}) });
}
console.error(out.length + " candidates");
// spread: sort by rating
out.sort((a, b) => +a.text.split(" r")[1].split(" ")[0] - +b.text.split(" r")[1].split(" ")[0]);
const n = +maxN; const pick = out.length <= n ? out : Array.from({ length: n }, (_, i) => out[Math.floor(i * out.length / n)]);
console.log(JSON.stringify([{ id: "pool", steps: pick }]));
