// tactics-show: print candidates from a pool .ok.json with ascii board
const { Chess } = require("chess.js");
const a = JSON.parse(require("fs").readFileSync(process.argv[2], "utf8"));
const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
a.forEach((s, i) => { if (only && !only.includes(i)) return; const c = new Chess(s.fen);
  console.log(`#${i} ${s.text}\n  ${s.fen}\n  sol: ${s.solution.join(" ")}`);
  if (process.env.ASCII) console.log(c.ascii()); });
