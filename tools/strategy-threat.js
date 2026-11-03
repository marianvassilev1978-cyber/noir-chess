// For scanned puzzles: keep those where student's first move is quiet (no capture/check, not in check),
// and print the opponent's threat (null-move analysis). Usage: node strategy-threat.js in.json [in2.json...]
const { Chess, Engine, pvSan } = require("./strategy-lib.js");
(async () => {
  const e = new Engine();
  for (const f of process.argv.slice(2)) for (const x of require(f)) {
    const c = new Chess(x.fen); if (c.inCheck()) continue;
    const mv = c.move(x.sol[0]); if (mv.captured || mv.san.includes("+")) continue;
    const parts = x.fen.split(" "); parts[1] = parts[1] === "w" ? "b" : "w"; parts[3] = "-";
    const nf = parts.join(" ");
    try { new Chess(nf); } catch (err) { continue; }
    const L = await e.analyse(nf, 1, 14);
    console.log(x.id, x.rating, x.fen, "::", x.sol.join(" "), "| THREAT", pvSan(nf, L[0].pv, 5).join(" "), L[0].score, "|", x.themes.replace(/ ?(short|long|middlegame|endgame|veryLong|oneMove)/g, ""));
  }
  e.quit();
})();
