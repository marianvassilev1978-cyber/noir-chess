// Probe: node strategy-probe.js "<fen>" "<moves>" -> engine lines after moves, plus threat (null move)
const { Chess, Engine, pvSan, play } = require("./strategy-lib.js");
(async () => {
  const e = new Engine();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const c = play(args[i + 1] || "", undefined, args[i]);
    const fen = c.fen();
    const L = await e.analyse(fen, 3, 16);
    console.log("##", args[i + 1], "->", fen);
    for (const l of L) console.log("   ", l.score, pvSan(fen, l.pv, 10).join(" "));
    if (!c.inCheck()) { const p = fen.split(" "); p[1] = p[1] === "w" ? "b" : "w"; p[3] = "-"; const nf = p.join(" ");
      try { new Chess(nf); const T = await e.analyse(nf, 1, 14); console.log("    THREAT:", T[0].score, pvSan(nf, T[0].pv, 6).join(" ")); } catch (x) {} }
  }
  e.quit();
})();
