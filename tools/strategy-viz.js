// Visualization helper: for start (moves) + line, print final position, check/mate, and pieces en prise.
const { Chess, play, strip } = require("./strategy-lib.js");
const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
function enPrise(c) {
  const out = [];
  for (const row of c.board()) for (const s of row) {
    if (!s || s.type === "k") continue;
    const opp = s.color === "w" ? "b" : "w";
    const att = c.attackers(s.square, opp), def = c.attackers(s.square, s.color);
    if (!att.length) continue;
    const minAtt = Math.min(...att.map((q) => V[c.get(q).type]));
    if (!def.length || minAtt < V[s.type]) out.push(`${s.color}${s.type.toUpperCase()}${s.square}(att ${att.join(",")} def ${def.join(",")})`);
  }
  return out;
}
module.exports = { enPrise };
if (require.main === module) {
  const [start, line] = process.argv.slice(2);
  const c0 = play(start); const fen = c0.fen();
  const c = play(line, undefined, fen);
  console.log("START", fen, "\nEND", c.fen(), "turn", c.turn(), "check", c.inCheck(), "mate", c.isCheckmate());
  console.log(c.ascii()); console.log("en prise:", enPrise(c).join("  "));
}
