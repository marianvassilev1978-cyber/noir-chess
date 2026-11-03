// tactics-describe: facts per ply for candidate exercises (attacked enemy pieces, checks, material)
const { Chess } = require("chess.js");
const a = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const mat = (c, col) => c.board().flat().filter((x) => x && x.color === col).reduce((s, x) => s + V[x.type], 0);
const N = { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" };
function attacksFrom(c, sq) {
  // squares attacked by piece on sq: use a copy with side to move = piece color, list legal-ish targets incl. defended own
  const p = c.get(sq); const res = [];
  for (const f of "abcdefgh") for (const r of "12345678") { const t = f + r; const q = c.get(t); if (!q || q.color === p.color) continue;
    if (c.attackers(t, p.color).includes(sq)) res.push(N[q.type] + t + (c.attackers(t, q.color).length ? "" : "(loose)")); }
  return res;
}
a.forEach((s, i) => { if (only && !only.includes(i)) return; const c = new Chess(s.fen); const me = c.turn(), op = me === "w" ? "b" : "w";
  const m0 = mat(c, me) - mat(c, op);
  console.log(`#${i} ${s.text}\n  ${s.fen}  ${me} to move`); if (process.env.ASCII) console.log(c.ascii());
  for (const san of s.solution) { const m = c.move(san); console.log(`   ${m.color} ${san}${m.captured ? " takes " + N[m.captured] : ""} -> hits ${attacksFrom(c, m.to).join(",")}`); }
  console.log(`  material diff change for student: ${(mat(c, me) - mat(c, op)) - m0}${c.isCheckmate() ? " MATE" : ""}`); });
