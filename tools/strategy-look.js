// Print position (ascii) + engine top lines for puzzle ids or raw FENs. Usage: node strategy-look.js id|fen ...
const { Chess, Engine, pvSan } = require("./strategy-lib.js");
const P = require("../content/puzzles.json");
const u = (s) => ({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
(async () => {
  const e = new Engine();
  for (const a of process.argv.slice(2)) {
    let fen = a, sol = "";
    const p = P.find((x) => x[4] === a);
    if (p) { const c = new Chess(p[0]); const ms = p[1].split(" "); const m0 = c.move(u(ms[0])); fen = c.fen(); const s = []; for (const m of ms.slice(1)) s.push(c.move(u(m)).san); sol = "prev " + m0.san + " | sol " + s.join(" ") + " | " + p[2] + " " + p[3]; }
    const c = new Chess(fen);
    console.log("=====", a, sol, "\n" + fen + "\n" + c.ascii());
    const L = await e.analyse(fen, 3, 16);
    for (const l of L) console.log("  ", l.score, pvSan(fen, l.pv, 10).join(" "));
  }
  e.quit();
})();
