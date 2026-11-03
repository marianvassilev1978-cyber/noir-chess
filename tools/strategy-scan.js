// Scan Lichess puzzles by theme; keep those whose student moves are unique at depth 18.
// Usage: node tools/strategy-scan.js <themeRegexAll(comma=AND)> <maxCount> <out.json> [minRating] [maxRating]
const fs = require("fs");
const { Chess, Engine } = require("./strategy-lib.js");
const P = require("../content/puzzles.json");
const want = process.argv[2].split(",");
const max = +process.argv[3], out = process.argv[4];
const lo = +(process.argv[5] || 0), hi = +(process.argv[6] || 4000);
(async () => {
  const eng = new Engine(); const res = [];
  const cands = P.filter((p) => { const th = p[3].split(" "); return want.every((w) => w.startsWith("!") ? !th.includes(w.slice(1)) : th.includes(w)) && p[2] >= lo && p[2] <= hi; });
  console.error(cands.length, "candidates");
  for (const p of cands.slice(0, max)) {
    const c = new Chess(p[0]); const ms = p[1].split(" ");
    const u = (s) => ({ from: s.slice(0, 2), to: s.slice(2, 4), promotion: s[4] });
    c.move(u(ms[0])); const fen = c.fen(); const sol = []; let ok = true; const gaps = [];
    for (let i = 1; i < ms.length; i++) {
      const f = c.fen(); const mv = c.move(u(ms[i])); sol.push(mv.san);
      if (i % 2 === 1) {
        const L = await eng.analyse(f, 2, 16);
        const played = ms[i];
        if (L[0].move !== played) { ok = false; break; }
        if (L[1] && !(L[0].score > 99000 && L[1].score > 99000)) { const g = L[0].score - L[1].score; gaps.push(g); if (g < 120 && !(L[0].score > 99000)) { ok = false; break; } }
        else gaps.push("mate");
        if (i === 1) gaps.push("ev" + L[0].score);
      }
    }
    if (ok) { res.push({ id: p[4], fen, sol, rating: p[2], themes: p[3], gaps }); fs.writeFileSync(out, JSON.stringify(res, null, 1)); }
  }
  eng.quit();
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.error("kept", res.length);
})();
